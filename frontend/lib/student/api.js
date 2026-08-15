/**
 * lib/student/api.js — Student Portal API layer.
 *
 * Each exported function is a thin, typed wrapper around ONE Laravel endpoint
 * from `endpoints.js`. Responses always pass through a normalizer from
 * `types.js`, and requests always go out in Laravel's snake_case.
 *
 * Until the backend ships those routes, "not implemented" responses
 * (404/405/501/network) transparently fall back to `mockData.js`, so the UI is
 * fully clickable today. Real auth/validation errors (401/403/419/422) are
 * never masked — they surface to the caller.
 *
 * Mode resolution (no Vercel dashboard var required in production):
 *   1. Explicit NEXT_PUBLIC_STUDENT_API=live|mock wins when set.
 *   2. Otherwise: NODE_ENV === 'production' → live; local/dev → mock.
 */

import { apiClient, apiGet, apiPost, apiPut, getCsrfCookie, ApiError } from '@/lib/api';
import { NOT_IMPLEMENTED_STATUSES, STUDENT_ENDPOINTS } from './endpoints';
import {
  applyLessonCompletion,
  groupLessonsByModule,
  normalizeCourseLesson,
  normalizeCourseProgress,
  normalizeEnrolledCourse,
  normalizeNotificationPreferences,
  normalizePurchaseRecord,
  normalizeUserProfile,
  unwrap,
} from './types';
import {
  MOCK_COURSES,
  MOCK_ORDERS,
  MOCK_PROFILE,
  findMockCourse,
  findMockCurriculum,
} from './mockData';

/**
 * @returns {'live' | 'mock'}
 */
function resolveStudentApiMode() {
  const explicit = String(process.env.NEXT_PUBLIC_STUDENT_API ?? '')
    .trim()
    .toLowerCase();

  if (explicit === 'live' || explicit === 'mock') {
    return explicit;
  }

  return process.env.NODE_ENV === 'production' ? 'live' : 'mock';
}

const MOCK_FALLBACK_ENABLED = resolveStudentApiMode() !== 'live';

function statusOf(error) {
  return Number(error?.status ?? error?.response?.status ?? 0);
}

function isNotImplemented(error) {
  return NOT_IMPLEMENTED_STATUSES.includes(statusOf(error));
}

/**
 * Run a live request; fall back to fixtures only when the route doesn't exist.
 *
 * @template T
 * @param {() => Promise<T>} live
 * @param {() => T} mock
 * @returns {Promise<{ data: T, source: 'api'|'mock' }>}
 */
async function withMockFallback(live, mock) {
  try {
    return { data: await live(), source: 'api' };
  } catch (error) {
    if (MOCK_FALLBACK_ENABLED && isNotImplemented(error)) {
      return { data: mock(), source: 'mock' };
    }
    throw error;
  }
}

/** Sanctum CSRF for mutations. Swallowed on failure so the real request reports the status. */
async function ensureCsrf() {
  try {
    await getCsrfCookie();
  } catch {
    // Intentionally ignored — the following request surfaces the real error.
  }
}

/* ─── Session-scoped mock progress ───────────────────────────────────────── */

/**
 * In mock mode, lesson completions live here for the duration of the tab so the
 * learning screen and "My Courses" percentages stay in sync. The real API
 * replaces this entirely — nothing else reads this map.
 *
 * @type {Map<string, Array<string|number>>}
 */
const mockCompletions = new Map();

function mockCompletedLessons(courseId) {
  const key = String(courseId);

  if (!mockCompletions.has(key)) {
    const course = findMockCourse(key);
    mockCompletions.set(key, [...(course?.progress?.completed_lessons || [])]);
  }

  return mockCompletions.get(key);
}

function mockCourseWithProgress(rawCourse) {
  const completed = mockCompletedLessons(rawCourse.id);

  return normalizeEnrolledCourse({
    ...rawCourse,
    progress: { ...rawCourse.progress, completed_lessons: completed },
  });
}

/* ─── Profile ────────────────────────────────────────────────────────────── */

/**
 * @param {import('./types').UserProfile|null} authUser Already-known user from
 *   AuthProvider, used to seed the mock so the page never shows fake names.
 * @returns {Promise<{ data: import('./types').UserProfile, source: 'api'|'mock' }>}
 */
export async function fetchStudentProfile(authUser = null) {
  return withMockFallback(
    async () => normalizeUserProfile(await apiGet(STUDENT_ENDPOINTS.profile)),
    () => normalizeUserProfile({ ...MOCK_PROFILE, ...(authUser || {}) })
  );
}

/**
 * @param {{ firstName: string, lastName: string, email: string, phoneNumber: string }} values
 */
export async function updateStudentProfile(values, currentProfile = null) {
  const payload = {
    first_name: values.firstName,
    last_name: values.lastName,
    email: values.email,
    phone_number: values.phoneNumber,
  };

  await ensureCsrf();

  return withMockFallback(
    async () => normalizeUserProfile(await apiPut(STUDENT_ENDPOINTS.profile, payload)),
    () => normalizeUserProfile({ ...(currentProfile || MOCK_PROFILE), ...payload })
  );
}

/**
 * Multipart avatar upload. Content-Type is cleared so Axios sets the boundary.
 *
 * @param {File} file
 * @returns {Promise<{ data: string, source: 'api'|'mock' }>} New avatar URL.
 */
export async function uploadStudentAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);

  await ensureCsrf();

  return withMockFallback(
    async () => {
      try {
        const response = await apiClient.request({
          method: 'post',
          url: STUDENT_ENDPOINTS.avatar,
          data: formData,
          headers: { 'Content-Type': undefined },
        });
        const body = unwrap(response.data, 'avatar_url', 'avatarUrl', 'url');
        return typeof body === 'string' ? body : normalizeUserProfile(response.data).avatarUrl;
      } catch (error) {
        throw new ApiError(
          error?.response?.data?.message || error?.message || 'Avatar upload failed.',
          statusOf(error),
          error?.response?.data || null
        );
      }
    },
    // Mock: preview the picked file locally via an object URL.
    () => (typeof URL !== 'undefined' ? URL.createObjectURL(file) : null)
  );
}

/**
 * @param {import('./types').PasswordChangePayload} values
 */
export async function changeStudentPassword(values) {
  const payload = {
    current_password: values.currentPassword,
    password: values.newPassword,
    password_confirmation: values.confirmPassword,
  };

  await ensureCsrf();

  return withMockFallback(
    async () => {
      await apiPut(STUDENT_ENDPOINTS.password, payload);
      return true;
    },
    () => true
  );
}

/**
 * @param {import('./types').NotificationPreferences} preferences
 */
export async function updateNotificationPreferences(preferences) {
  const payload = {
    course_updates: preferences.courseUpdates,
    new_certificates: preferences.newCertificates,
    promotional_announcements: preferences.promotions,
  };

  await ensureCsrf();

  return withMockFallback(
    async () =>
      normalizeNotificationPreferences(
        unwrap(
          await apiPut(STUDENT_ENDPOINTS.notifications, payload),
          'notification_preferences',
          'notificationPreferences'
        )
      ),
    () => normalizeNotificationPreferences(payload)
  );
}

/* ─── Purchase history ───────────────────────────────────────────────────── */

/** @returns {Promise<{ data: import('./types').PurchaseRecord[], source: 'api'|'mock' }>} */
export async function fetchPurchaseHistory() {
  return withMockFallback(
    async () => {
      const rows = unwrap(await apiGet(STUDENT_ENDPOINTS.orders), 'orders');
      return (Array.isArray(rows) ? rows : []).map(normalizePurchaseRecord);
    },
    () => MOCK_ORDERS.map(normalizePurchaseRecord)
  );
}

function saveBlob(blob, filename) {
  if (typeof document === 'undefined') return;

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Print-ready invoice used while the Laravel PDF route is pending. Opening it
 * lets the browser's own "Save as PDF" finish the job.
 */
function buildInvoicePreview(order, labels) {
  const html = `<!doctype html>
<html dir="${labels.dir}" lang="${labels.lang}">
<head><meta charset="utf-8"><title>${labels.invoice} ${order.orderId}</title>
<style>
  body{font-family:system-ui,-apple-system,Segoe UI,sans-serif;margin:0;padding:48px;color:#181124}
  h1{margin:0 0 4px;font-size:22px}
  .muted{color:#6b7280;font-size:13px}
  table{width:100%;border-collapse:collapse;margin-top:32px}
  th,td{text-align:${labels.dir === 'rtl' ? 'right' : 'left'};padding:12px 8px;border-bottom:1px solid #e5e7eb;font-size:14px}
  tfoot td{font-weight:700;border-bottom:none}
</style></head>
<body>
  <h1>${labels.brand}</h1>
  <p class="muted">${labels.invoice} · ${order.orderId} · ${labels.date}: ${order.purchasedAt}</p>
  <table>
    <thead><tr><th>${labels.course}</th><th>${labels.status}</th><th>${labels.total}</th></tr></thead>
    <tbody><tr><td>${order.courseTitle}</td><td>${order.status}</td><td>${order.amount} ${order.currency}</td></tr></tbody>
    <tfoot><tr><td colspan="2">${labels.total}</td><td>${order.amount} ${order.currency}</td></tr></tfoot>
  </table>
</body></html>`;

  const blob = new Blob([html], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  window.open(url, '_blank', 'noopener,noreferrer');
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

/**
 * Download an invoice PDF. Falls back to a print-ready preview window when the
 * backend route isn't live yet.
 *
 * @param {import('./types').PurchaseRecord} order
 * @returns {Promise<'api'|'preview'>}
 */
export async function downloadInvoice(order, labels) {
  try {
    const blob = await apiGet(STUDENT_ENDPOINTS.orderInvoice(order.orderId), {
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    });
    saveBlob(blob, `invoice-${order.orderId}.pdf`);
    return 'api';
  } catch (error) {
    if (!MOCK_FALLBACK_ENABLED || !isNotImplemented(error)) throw error;

    if (order.invoiceUrl) {
      window.open(order.invoiceUrl, '_blank', 'noopener,noreferrer');
      return 'api';
    }

    buildInvoicePreview(order, labels);
    return 'preview';
  }
}

/* ─── Courses & curriculum ───────────────────────────────────────────────── */

/** @returns {Promise<{ data: import('./types').EnrolledCourse[], source: 'api'|'mock' }>} */
export async function fetchEnrolledCourses() {
  return withMockFallback(
    async () => {
      const rows = unwrap(await apiGet(STUDENT_ENDPOINTS.courses), 'courses');
      return (Array.isArray(rows) ? rows : []).map(normalizeEnrolledCourse);
    },
    () => MOCK_COURSES.map(mockCourseWithProgress)
  );
}

/** @returns {Promise<{ data: import('./types').EnrolledCourse|null, source: 'api'|'mock' }>} */
export async function fetchCourse(courseId) {
  return withMockFallback(
    async () => normalizeEnrolledCourse(unwrap(await apiGet(STUDENT_ENDPOINTS.course(courseId)), 'course')),
    () => {
      const raw = findMockCourse(courseId);
      return raw ? mockCourseWithProgress(raw) : null;
    }
  );
}

/**
 * Curriculum + module grouping. `completedLessonIds` comes from the course
 * progress so lesson rows render their status without a second request.
 *
 * @returns {Promise<{ data: { lessons: import('./types').CourseLesson[], modules: import('./types').CourseModule[] }, source: 'api'|'mock' }>}
 */
export async function fetchCourseCurriculum(courseId, completedLessonIds = []) {
  const build = (rows) => {
    const lessons = (Array.isArray(rows) ? rows : []).map((row, index) =>
      normalizeCourseLesson(row, index, completedLessonIds)
    );
    return { lessons, modules: groupLessonsByModule(lessons) };
  };

  return withMockFallback(
    async () =>
      build(unwrap(await apiGet(STUDENT_ENDPOINTS.courseCurriculum(courseId)), 'lessons', 'curriculum')),
    () => build(findMockCurriculum(courseId))
  );
}

/** @returns {Promise<{ data: import('./types').CourseProgress, source: 'api'|'mock' }>} */
export async function fetchCourseProgress(courseId) {
  return withMockFallback(
    async () => normalizeCourseProgress(await apiGet(STUDENT_ENDPOINTS.courseProgress(courseId)), courseId),
    () => {
      const raw = findMockCourse(courseId);
      return normalizeCourseProgress(
        {
          ...(raw?.progress || {}),
          completed_lessons: mockCompletedLessons(courseId),
        },
        courseId
      );
    }
  );
}

/**
 * Mark / unmark a lesson complete and return the recalculated course progress.
 *
 * @param {string|number} courseId
 * @param {string|number} lessonId
 * @param {boolean} completed
 * @param {import('./types').CourseProgress} currentProgress Used for the mock recalculation.
 */
export async function setLessonCompletion(courseId, lessonId, completed, currentProgress) {
  await ensureCsrf();

  return withMockFallback(
    async () => {
      const endpoint = STUDENT_ENDPOINTS.lessonCompletion(courseId, lessonId);
      const response = completed
        ? await apiPost(endpoint, { completed: true })
        : await apiClient
            .request({ method: 'delete', url: endpoint })
            .then((res) => res.data)
            .catch((error) => {
              throw new ApiError(
                error?.response?.data?.message || error?.message || 'Request failed.',
                statusOf(error),
                error?.response?.data || null
              );
            });

      return normalizeCourseProgress(response, courseId);
    },
    () => {
      const next = applyLessonCompletion(currentProgress, lessonId, completed);
      mockCompletions.set(String(courseId), [...next.completedLessons]);
      return next;
    }
  );
}

/**
 * Trigger a resource download. Same-origin/blob-friendly files download
 * directly; anything else opens in a new tab.
 *
 * @param {import('./types').LessonResource} resource
 */
export function downloadLessonResource(resource) {
  if (typeof document === 'undefined' || !resource?.url) return;

  const anchor = document.createElement('a');
  anchor.href = resource.url;
  anchor.download = resource.title || '';
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

export { MOCK_FALLBACK_ENABLED };
