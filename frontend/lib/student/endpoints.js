/**
 * lib/student/endpoints.js — Laravel API contract for the Student Portal.
 *
 * Every network path the portal uses lives here, so the backend team (and a
 * future Admin Panel) has one file to implement against. Paths are relative to
 * the Axios `/api` baseURL configured in `lib/api.js`.
 *
 * Suggested Laravel routes (routes/api.php, `auth:sanctum` + `verified`):
 *
 *   GET    /api/student/profile                                    → UserProfile
 *   PUT    /api/student/profile                                    → UserProfile
 *   POST   /api/student/profile/avatar        (multipart: avatar)   → { avatar_url }
 *   PUT    /api/student/profile/password                            → 204
 *   PUT    /api/student/profile/notifications                       → NotificationPreferences
 *   GET    /api/student/orders                                      → PurchaseRecord[]
 *   GET    /api/student/orders/{orderId}/invoice                    → application/pdf
 *   GET    /api/student/courses                                     → EnrolledCourse[]
 *   GET    /api/student/courses/{courseId}                          → EnrolledCourse
 *   GET    /api/student/courses/{courseId}/curriculum               → CourseLesson[]
 *   GET    /api/student/courses/{courseId}/progress                 → CourseProgress
 *   POST   /api/student/courses/{courseId}/lessons/{lessonId}/complete   → CourseProgress
 *   DELETE /api/student/courses/{courseId}/lessons/{lessonId}/complete   → CourseProgress
 */

const encode = (value) => encodeURIComponent(String(value));

export const STUDENT_ENDPOINTS = {
  profile: '/student/profile',
  avatar: '/student/profile/avatar',
  password: '/student/profile/password',
  notifications: '/student/profile/notifications',

  orders: '/student/orders',
  orderInvoice: (orderId) => `/student/orders/${encode(orderId)}/invoice`,

  courses: '/student/courses',
  course: (courseId) => `/student/courses/${encode(courseId)}`,
  courseCurriculum: (courseId) => `/student/courses/${encode(courseId)}/curriculum`,
  courseProgress: (courseId) => `/student/courses/${encode(courseId)}/progress`,
  lessonCompletion: (courseId, lessonId) =>
    `/student/courses/${encode(courseId)}/lessons/${encode(lessonId)}/complete`,
};

/**
 * Statuses historically used for "endpoint not built yet" probes.
 * Student/catalog API layers no longer silently mock on these — errors surface.
 */
export const NOT_IMPLEMENTED_STATUSES = [0, 404, 405, 501, 502, 503];
