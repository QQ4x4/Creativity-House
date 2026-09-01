/**
 * Admin data service.
 *
 * The only module that knows the admin transport is HTTP. Every function is a
 * plain async call taking/returning domain objects, which is the same contract
 * a NextCRM Server Action exposes — migrating means reimplementing the bodies
 * here and adding `'use server'`, with no changes in the components.
 *
 * Errors are never swallowed: callers get an ApiError to surface in the UI.
 */

import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import { ADMIN_ENDPOINTS } from './endpoints';
import type {
  AdminCourseDto,
  AdminLessonDto,
  AdminModuleDto,
  BunnyVideo,
  BunnyVideoListResult,
} from './types';

/** Laravel resources wrap payloads in `data`; collections may not. */
function unwrap<T>(payload: unknown): T {
  if (payload && typeof payload === 'object' && 'data' in (payload as Record<string, unknown>)) {
    return (payload as { data: T }).data;
  }
  return payload as T;
}

export async function fetchAdminCourse(courseId: number | string): Promise<AdminCourseDto> {
  return unwrap<AdminCourseDto>(await apiGet(ADMIN_ENDPOINTS.course(courseId)));
}

export async function fetchAdminCourses(search = ''): Promise<AdminCourseDto[]> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';
  return unwrap<AdminCourseDto[]>(await apiGet(`${ADMIN_ENDPOINTS.courses}${query}`)) ?? [];
}

/** POST /api/v1/admin/courses — create a new course shell. */
export async function createAdminCourse(
  payload: Record<string, unknown>
): Promise<AdminCourseDto> {
  return unwrap<AdminCourseDto>(await apiPost(ADMIN_ENDPOINTS.courses, payload));
}

/**
 * Saves the course columns. Only the keys present in `payload` are written, so
 * a partial save never nulls out fields the form did not touch.
 */
export async function updateAdminCourse(
  courseId: number | string,
  payload: Record<string, unknown>
): Promise<AdminCourseDto> {
  return unwrap<AdminCourseDto>(await apiPut(ADMIN_ENDPOINTS.course(courseId), payload));
}

/** Whole-tree curriculum save; rows missing from the payload are deleted. */
export async function syncAdminCurriculum(
  courseId: number | string,
  payload: Record<string, unknown>
): Promise<AdminModuleDto[]> {
  return unwrap<AdminModuleDto[]>(await apiPut(ADMIN_ENDPOINTS.curriculum(courseId), payload)) ?? [];
}

export async function fetchAdminCurriculum(courseId: number | string): Promise<AdminModuleDto[]> {
  return unwrap<AdminModuleDto[]>(await apiGet(ADMIN_ENDPOINTS.curriculum(courseId))) ?? [];
}

/* ─── Granular curriculum CRUD ───────────────────────────────────────────────
 * The editor saves the whole tree, but these keep the module/lesson endpoints
 * usable for incremental or scripted edits.
 */

export async function createAdminModule(
  courseId: number | string,
  payload: Record<string, unknown>
): Promise<AdminModuleDto> {
  return unwrap<AdminModuleDto>(await apiPost(ADMIN_ENDPOINTS.modules(courseId), payload));
}

export async function updateAdminModule(
  courseId: number | string,
  moduleId: number | string,
  payload: Record<string, unknown>
): Promise<AdminModuleDto> {
  return unwrap<AdminModuleDto>(await apiPut(ADMIN_ENDPOINTS.module(courseId, moduleId), payload));
}

export async function deleteAdminModule(
  courseId: number | string,
  moduleId: number | string
): Promise<void> {
  await apiDelete(ADMIN_ENDPOINTS.module(courseId, moduleId));
}

export async function createAdminLesson(
  courseId: number | string,
  moduleId: number | string,
  payload: Record<string, unknown>
): Promise<AdminLessonDto> {
  return unwrap<AdminLessonDto>(
    await apiPost(ADMIN_ENDPOINTS.moduleLessons(courseId, moduleId), payload)
  );
}

export async function updateAdminLesson(
  courseId: number | string,
  lessonId: number | string,
  payload: Record<string, unknown>
): Promise<AdminLessonDto> {
  return unwrap<AdminLessonDto>(await apiPut(ADMIN_ENDPOINTS.lesson(courseId, lessonId), payload));
}

export async function deleteAdminLesson(
  courseId: number | string,
  lessonId: number | string
): Promise<void> {
  await apiDelete(ADMIN_ENDPOINTS.lesson(courseId, lessonId));
}

/* ─── Bunny Stream ───────────────────────────────────────────────────────── */

/**
 * Reads the Bunny library through the Laravel proxy. The AccessKey stays on the
 * server, so this never talks to video.bunnycdn.com directly.
 *
 * A 503 (not configured) or 502 (Bunny unreachable) resolves to an empty,
 * flagged result instead of throwing — the picker degrades to manual entry.
 */
export async function fetchBunnyVideos(search = ''): Promise<BunnyVideoListResult> {
  const query = search.trim() ? `?search=${encodeURIComponent(search.trim())}` : '';

  try {
    const payload = (await apiGet(`${ADMIN_ENDPOINTS.bunnyVideos}${query}`)) as {
      configured?: boolean;
      data?: BunnyVideo[];
      meta?: { total?: number; library_id?: string | null };
    };

    return {
      configured: payload?.configured !== false,
      videos: Array.isArray(payload?.data) ? payload.data : [],
      libraryId: payload?.meta?.library_id ?? null,
      total: payload?.meta?.total ?? 0,
    };
  } catch (error) {
    const status = (error as { status?: number })?.status ?? 0;

    if (status === 503 || status === 502) {
      return {
        configured: false,
        videos: [],
        libraryId: null,
        total: 0,
        message: (error as { message?: string })?.message ?? 'Bunny Stream is unavailable.',
      };
    }

    throw error;
  }
}
