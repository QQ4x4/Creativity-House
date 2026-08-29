/**
 * lib/student/api.js — Student Portal API layer (live Laravel only).
 *
 * Every call hits the Sanctum-authenticated student endpoints. Failures
 * propagate to the caller — there is no silent mock / fixture fallback.
 */

import { apiClient, apiGet, apiPost, apiPut, getCsrfCookie, ApiError } from '@/lib/api';
import { STUDENT_ENDPOINTS } from './endpoints';
import {
  groupLessonsByModule,
  normalizeCourseLesson,
  normalizeCourseProgress,
  normalizeEnrolledCourse,
  normalizeNotificationPreferences,
  normalizePurchaseRecord,
  normalizeUserProfile,
  unwrap,
} from './types';

function statusOf(error) {
  return Number(error?.status ?? error?.response?.status ?? 0);
}

/** Sanctum CSRF for mutations. Swallowed on failure so the real request reports the status. */
async function ensureCsrf() {
  try {
    await getCsrfCookie();
  } catch {
    // Intentionally ignored — the following request surfaces the real error.
  }
}

/* ─── Profile ────────────────────────────────────────────────────────────── */

/**
 * @param {import('./types').UserProfile|null} _authUser Unused (kept for call-site compatibility).
 * @returns {Promise<{ data: import('./types').UserProfile, source: 'api' }>}
 */
export async function fetchStudentProfile(_authUser = null) {
  return {
    data: normalizeUserProfile(await apiGet(STUDENT_ENDPOINTS.profile)),
    source: 'api',
  };
}

/**
 * @param {{ firstName: string, lastName: string, email: string, phoneNumber: string }} values
 */
export async function updateStudentProfile(values) {
  const payload = {
    first_name: values.firstName,
    last_name: values.lastName,
    email: values.email,
    phone_number: values.phoneNumber,
  };

  await ensureCsrf();

  return {
    data: normalizeUserProfile(await apiPut(STUDENT_ENDPOINTS.profile, payload)),
    source: 'api',
  };
}

/**
 * Multipart avatar upload. Content-Type is cleared so Axios sets the boundary.
 *
 * @param {File} file
 * @returns {Promise<{ data: string, source: 'api' }>} New avatar URL.
 */
export async function uploadStudentAvatar(file) {
  const formData = new FormData();
  formData.append('avatar', file);

  await ensureCsrf();

  try {
    const response = await apiClient.request({
      method: 'post',
      url: STUDENT_ENDPOINTS.avatar,
      data: formData,
      headers: { 'Content-Type': undefined },
    });
    const body = unwrap(response.data, 'avatar_url', 'avatarUrl', 'url');
    const url = typeof body === 'string' ? body : normalizeUserProfile(response.data).avatarUrl;
    return { data: url, source: 'api' };
  } catch (error) {
    throw new ApiError(
      error?.response?.data?.message || error?.message || 'Avatar upload failed.',
      statusOf(error),
      error?.response?.data || null
    );
  }
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
  await apiPut(STUDENT_ENDPOINTS.password, payload);
  return { data: true, source: 'api' };
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

  return {
    data: normalizeNotificationPreferences(
      unwrap(
        await apiPut(STUDENT_ENDPOINTS.notifications, payload),
        'notification_preferences',
        'notificationPreferences'
      )
    ),
    source: 'api',
  };
}

/* ─── Purchase history ───────────────────────────────────────────────────── */

/** @returns {Promise<{ data: import('./types').PurchaseRecord[], source: 'api' }>} */
export async function fetchPurchaseHistory() {
  const rows = unwrap(await apiGet(STUDENT_ENDPOINTS.orders), 'orders');
  return {
    data: (Array.isArray(rows) ? rows : []).map(normalizePurchaseRecord),
    source: 'api',
  };
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
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Print-ready invoice when the backend has no stored PDF yet (HTTP 404 only).
 * Not a course-data mock — only fills a missing invoice file.
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
 * Download an invoice PDF. On 404 (no stored PDF), opens a print-ready preview
 * from the live order fields. All other errors propagate.
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
    if (statusOf(error) !== 404) throw error;

    if (order.invoiceUrl) {
      window.open(order.invoiceUrl, '_blank', 'noopener,noreferrer');
      return 'api';
    }

    buildInvoicePreview(order, labels);
    return 'preview';
  }
}

/* ─── Courses & curriculum ───────────────────────────────────────────────── */

/** @returns {Promise<{ data: import('./types').EnrolledCourse[], source: 'api' }>} */
export async function fetchEnrolledCourses() {
  const rows = unwrap(await apiGet(STUDENT_ENDPOINTS.courses), 'courses');
  return {
    data: (Array.isArray(rows) ? rows : []).map(normalizeEnrolledCourse),
    source: 'api',
  };
}

/** @returns {Promise<{ data: import('./types').EnrolledCourse|null, source: 'api' }>} */
export async function fetchCourse(courseId) {
  const raw = unwrap(await apiGet(STUDENT_ENDPOINTS.course(courseId)), 'course');
  return {
    data: raw ? normalizeEnrolledCourse(raw) : null,
    source: 'api',
  };
}

/**
 * Curriculum + module grouping.
 *
 * @returns {Promise<{ data: { lessons: import('./types').CourseLesson[], modules: import('./types').CourseModule[] }, source: 'api' }>}
 */
export async function fetchCourseCurriculum(courseId, completedLessonIds = []) {
  const rows = unwrap(
    await apiGet(STUDENT_ENDPOINTS.courseCurriculum(courseId)),
    'lessons',
    'curriculum'
  );
  const lessons = (Array.isArray(rows) ? rows : []).map((row, index) =>
    normalizeCourseLesson(row, index, completedLessonIds)
  );

  return {
    data: { lessons, modules: groupLessonsByModule(lessons) },
    source: 'api',
  };
}

/** @returns {Promise<{ data: import('./types').CourseProgress, source: 'api' }>} */
export async function fetchCourseProgress(courseId) {
  return {
    data: normalizeCourseProgress(await apiGet(STUDENT_ENDPOINTS.courseProgress(courseId)), courseId),
    source: 'api',
  };
}

/**
 * Mark / unmark a lesson complete and return the recalculated course progress.
 *
 * @param {string|number} courseId
 * @param {string|number} lessonId
 * @param {boolean} completed
 */
export async function setLessonCompletion(courseId, lessonId, completed) {
  await ensureCsrf();

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

  return {
    data: normalizeCourseProgress(response, courseId),
    source: 'api',
  };
}

/**
 * Trigger a resource download.
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
