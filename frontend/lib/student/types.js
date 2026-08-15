/**
 * lib/student/types.js — Student Portal domain models.
 *
 * Single source of truth for the shapes the Student Portal renders. Every
 * normalizer accepts BOTH Laravel snake_case payloads and camelCase mock data,
 * so a future Admin Panel can start returning real rows from
 * `lib/student/endpoints.js` without touching a single component.
 *
 * Rule: components only ever read the normalized camelCase shape.
 */

/**
 * @typedef {Object} NotificationPreferences
 * @property {boolean} courseUpdates    Email me when a course I own is updated.
 * @property {boolean} newCertificates  Email me when I earn a certificate.
 * @property {boolean} promotions       Promotional announcements / offers.
 */

/**
 * @typedef {Object} UserProfile
 * @property {number|string} id
 * @property {string} firstName
 * @property {string} lastName
 * @property {string} email
 * @property {string} phoneNumber        E.164 (`+9677XXXXXXX`).
 * @property {string|null} avatarUrl
 * @property {boolean} emailVerified
 * @property {NotificationPreferences} notificationPreferences
 */

/**
 * Password changes are write-only — never part of UserProfile responses.
 *
 * @typedef {Object} PasswordChangePayload
 * @property {string} currentPassword
 * @property {string} newPassword
 * @property {string} confirmPassword
 */

/**
 * @typedef {'paid'|'pending'|'refunded'|'failed'} PaymentStatus
 */

/**
 * @typedef {Object} PurchaseRecord
 * @property {string} orderId            Human-facing reference (e.g. `CH-2026-0031`).
 * @property {string|number} courseId
 * @property {string} courseTitle
 * @property {number} amount
 * @property {string} currency           ISO 4217 (`USD`, `SAR`, `YER`…).
 * @property {string} purchasedAt        ISO 8601 date string.
 * @property {PaymentStatus} status
 * @property {string|null} invoiceUrl    PDF endpoint or signed download URL.
 */

/**
 * @typedef {Object} CourseProgress
 * @property {string|number} courseId
 * @property {number} totalLessons
 * @property {Array<string|number>} completedLessons  Lesson IDs, order-independent.
 * @property {number} completionPercentage            0–100, integer.
 * @property {number} totalLearningSeconds            Watch time accumulated.
 */

/**
 * @typedef {Object} LessonResource
 * @property {string|number} id
 * @property {string} title
 * @property {string} url
 * @property {string} type       `pdf` | `zip` | `doc` | …
 * @property {number|null} sizeBytes
 */

/**
 * @typedef {Object} CourseLesson
 * @property {string|number} id
 * @property {string|number} moduleId
 * @property {string} moduleName
 * @property {string} title
 * @property {string} videoUrl
 * @property {number} durationSeconds
 * @property {LessonResource[]} resources
 * @property {boolean} completed
 * @property {boolean} locked
 * @property {number} order
 */

/**
 * @typedef {Object} CourseModule
 * @property {string|number} id
 * @property {string} name
 * @property {CourseLesson[]} lessons
 */

/**
 * @typedef {Object} EnrolledCourse
 * @property {string|number} id
 * @property {string} title
 * @property {string} slug
 * @property {string} coverImageUrl
 * @property {string} instructorName
 * @property {string} level
 * @property {string} enrolledAt                 ISO 8601.
 * @property {boolean} certificateEarned
 * @property {CourseProgress} progress
 * @property {string|number|null} nextLessonId   Resume target for "Continue Learning".
 */

/* ─── Primitives ─────────────────────────────────────────────────────────── */

function firstDefined(...values) {
  return values.find((value) => value !== undefined && value !== null);
}

function toBool(value, fallback = false) {
  if (value === undefined || value === null) return fallback;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value !== 0;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toText(value, fallback = '') {
  if (value === undefined || value === null) return fallback;
  return String(value);
}

function toArray(value) {
  if (Array.isArray(value)) return value;
  if (value === undefined || value === null || value === '') return [];
  return [value];
}

/** Unwrap Laravel API Resource envelopes (`{ data: … }`, `{ courses: … }`). */
export function unwrap(payload, ...keys) {
  if (!payload || typeof payload !== 'object') return payload;

  for (const key of keys) {
    if (payload[key] !== undefined) return payload[key];
  }

  return payload.data !== undefined ? payload.data : payload;
}

/* ─── Normalizers ────────────────────────────────────────────────────────── */

/** @returns {NotificationPreferences} */
export function normalizeNotificationPreferences(raw) {
  const source = raw || {};

  return {
    courseUpdates: toBool(
      firstDefined(source.courseUpdates, source.course_updates),
      true
    ),
    newCertificates: toBool(
      firstDefined(source.newCertificates, source.new_certificates),
      true
    ),
    promotions: toBool(
      firstDefined(source.promotions, source.promotional_announcements),
      false
    ),
  };
}

/** @returns {UserProfile} */
export function normalizeUserProfile(raw) {
  const source = unwrap(raw, 'user', 'profile') || {};

  return {
    id: firstDefined(source.id, source.user_id, '') ?? '',
    firstName: toText(firstDefined(source.firstName, source.first_name)),
    lastName: toText(firstDefined(source.lastName, source.last_name)),
    email: toText(source.email),
    phoneNumber: toText(firstDefined(source.phoneNumber, source.phone_number, source.phone)),
    avatarUrl: firstDefined(source.avatarUrl, source.avatar_url, source.avatar) || null,
    emailVerified: toBool(
      firstDefined(source.emailVerified, source.email_verified, source.email_verified_at)
    ),
    notificationPreferences: normalizeNotificationPreferences(
      firstDefined(source.notificationPreferences, source.notification_preferences)
    ),
  };
}

/** @returns {PaymentStatus} */
function normalizePaymentStatus(raw) {
  const value = toText(raw).toLowerCase();
  if (['paid', 'completed', 'succeeded', 'success'].includes(value)) return 'paid';
  if (['refunded', 'refund'].includes(value)) return 'refunded';
  if (['failed', 'cancelled', 'canceled', 'declined'].includes(value)) return 'failed';
  return 'pending';
}

/** @returns {PurchaseRecord} */
export function normalizePurchaseRecord(raw) {
  const source = raw || {};

  return {
    orderId: toText(firstDefined(source.orderId, source.order_id, source.reference, source.id)),
    courseId: firstDefined(source.courseId, source.course_id, '') ?? '',
    courseTitle: toText(firstDefined(source.courseTitle, source.course_title, source.title)),
    amount: toNumber(firstDefined(source.amount, source.total, source.total_price)),
    currency: toText(firstDefined(source.currency, source.currency_code), 'USD').toUpperCase(),
    purchasedAt: toText(
      firstDefined(source.purchasedAt, source.purchased_at, source.created_at, source.date)
    ),
    status: normalizePaymentStatus(
      firstDefined(source.status, source.payment_status)
    ),
    invoiceUrl: firstDefined(source.invoiceUrl, source.invoice_url, source.invoice) || null,
  };
}

/** @returns {CourseProgress} */
export function normalizeCourseProgress(raw, courseId = '') {
  const source = unwrap(raw, 'progress') || {};

  const completedLessons = toArray(
    firstDefined(source.completedLessons, source.completed_lessons, source.completed_lesson_ids)
  );

  const totalLessons = toNumber(
    firstDefined(source.totalLessons, source.total_lessons, source.lessons_count)
  );

  const explicitPercentage = firstDefined(
    source.completionPercentage,
    source.completion_percentage,
    source.percentage
  );

  return {
    courseId: firstDefined(source.courseId, source.course_id, courseId) ?? courseId,
    totalLessons,
    completedLessons,
    completionPercentage:
      explicitPercentage !== undefined
        ? clampPercentage(toNumber(explicitPercentage))
        : calculateCompletionPercentage(completedLessons.length, totalLessons),
    totalLearningSeconds: toNumber(
      firstDefined(
        source.totalLearningSeconds,
        source.total_learning_seconds,
        source.total_learning_time
      )
    ),
  };
}

/** @returns {LessonResource} */
export function normalizeLessonResource(raw, index = 0) {
  const source = raw || {};
  const url = toText(firstDefined(source.url, source.file_url, source.href));

  return {
    id: firstDefined(source.id, source.resource_id, `resource-${index}`),
    title: toText(firstDefined(source.title, source.name, source.file_name), url),
    url,
    type: toText(
      firstDefined(source.type, source.file_type, source.extension),
      url.split('.').pop() || 'file'
    ).toLowerCase(),
    sizeBytes: firstDefined(source.sizeBytes, source.size_bytes, source.size) ?? null,
  };
}

/** @returns {CourseLesson} */
export function normalizeCourseLesson(raw, index = 0, completedLessonIds = []) {
  const source = raw || {};
  const id = firstDefined(source.id, source.lesson_id, `lesson-${index}`);

  const completedFromProgress = completedLessonIds.some(
    (completedId) => String(completedId) === String(id)
  );

  return {
    id,
    moduleId: firstDefined(source.moduleId, source.module_id, source.module, 'module-1'),
    moduleName: toText(firstDefined(source.moduleName, source.module_name), ''),
    title: toText(firstDefined(source.title, source.name)),
    videoUrl: toText(firstDefined(source.videoUrl, source.video_url, source.video)),
    durationSeconds: toNumber(
      firstDefined(source.durationSeconds, source.duration_seconds, source.duration)
    ),
    resources: toArray(firstDefined(source.resources, source.attachments, source.files)).map(
      normalizeLessonResource
    ),
    completed:
      completedFromProgress ||
      toBool(firstDefined(source.completed, source.is_completed, source.completed_at)),
    locked: toBool(firstDefined(source.locked, source.is_locked)),
    order: toNumber(firstDefined(source.order, source.position, source.sort_order), index + 1),
  };
}

/**
 * Flat lesson list → grouped modules, preserving lesson order.
 *
 * @param {CourseLesson[]} lessons
 * @returns {CourseModule[]}
 */
export function groupLessonsByModule(lessons = []) {
  /** @type {Map<string, CourseModule>} */
  const modules = new Map();

  lessons.forEach((lesson) => {
    const key = String(lesson.moduleId);

    if (!modules.has(key)) {
      modules.set(key, {
        id: lesson.moduleId,
        name: lesson.moduleName || '',
        lessons: [],
      });
    }

    modules.get(key).lessons.push(lesson);
  });

  return [...modules.values()];
}

/** @returns {EnrolledCourse} */
export function normalizeEnrolledCourse(raw) {
  const source = raw || {};
  const id = firstDefined(source.id, source.course_id, '') ?? '';

  return {
    id,
    title: toText(firstDefined(source.title, source.name)),
    slug: toText(firstDefined(source.slug, source.course_slug), String(id)),
    coverImageUrl: toText(
      firstDefined(source.coverImageUrl, source.cover_image_url, source.thumbnail, source.image)
    ),
    instructorName: toText(
      firstDefined(source.instructorName, source.instructor_name, source.instructor)
    ),
    level: toText(firstDefined(source.level, source.difficulty)),
    enrolledAt: toText(firstDefined(source.enrolledAt, source.enrolled_at, source.created_at)),
    certificateEarned: toBool(
      firstDefined(source.certificateEarned, source.certificate_earned, source.has_certificate)
    ),
    progress: normalizeCourseProgress(
      firstDefined(source.progress, source.course_progress),
      id
    ),
    nextLessonId:
      firstDefined(source.nextLessonId, source.next_lesson_id, source.resume_lesson_id) ?? null,
  };
}

/* ─── Derived values ────────────────────────────────────────────────────── */

export function clampPercentage(value) {
  return Math.max(0, Math.min(100, Math.round(toNumber(value))));
}

export function calculateCompletionPercentage(completedCount, totalCount) {
  if (!totalCount) return 0;
  return clampPercentage((toNumber(completedCount) / toNumber(totalCount)) * 100);
}

/**
 * Recompute a CourseProgress after a lesson is toggled — pure, so both the
 * optimistic UI update and the server echo run through the same math.
 *
 * @param {CourseProgress} progress
 * @param {string|number} lessonId
 * @param {boolean} completed
 * @returns {CourseProgress}
 */
export function applyLessonCompletion(progress, lessonId, completed) {
  const others = (progress.completedLessons || []).filter(
    (id) => String(id) !== String(lessonId)
  );
  const completedLessons = completed ? [...others, lessonId] : others;

  return {
    ...progress,
    completedLessons,
    completionPercentage: calculateCompletionPercentage(
      completedLessons.length,
      progress.totalLessons
    ),
  };
}

/**
 * Aggregate stats for the "My Courses" summary bar.
 *
 * @param {EnrolledCourse[]} courses
 */
export function summarizeCourses(courses = []) {
  const totalSeconds = courses.reduce(
    (sum, course) => sum + toNumber(course.progress?.totalLearningSeconds),
    0
  );

  return {
    totalCourses: courses.length,
    certificatesEarned: courses.filter((course) => course.certificateEarned).length,
    totalLearningSeconds: totalSeconds,
    totalLearningHours: Math.round((totalSeconds / 3600) * 10) / 10,
  };
}

/* ─── Formatters (hydration-safe: no locale/timezone lookups) ───────────── */

const MONTH_NAMES = {
  en: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
  ar: [
    'يناير',
    'فبراير',
    'مارس',
    'أبريل',
    'مايو',
    'يونيو',
    'يوليو',
    'أغسطس',
    'سبتمبر',
    'أكتوبر',
    'نوفمبر',
    'ديسمبر',
  ],
};

/**
 * ISO date → "12 Mar 2026". Parsed from the string itself (never `new Date()`
 * + `toLocaleDateString`) so server and client always render identical markup.
 */
export function formatDate(isoString, lang = 'en') {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(toText(isoString));
  if (!match) return toText(isoString);

  const [, year, month, day] = match;
  const monthName = MONTH_NAMES[lang === 'ar' ? 'ar' : 'en'][Number(month) - 1] || month;

  return `${Number(day)} ${monthName} ${year}`;
}

/** Seconds → `mm:ss` / `h:mm:ss`. */
export function formatDuration(totalSeconds) {
  const safe = Math.max(0, Math.floor(toNumber(totalSeconds)));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (n) => String(n).padStart(2, '0');

  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** Seconds → "3.5" (hours, one decimal) for the stat cards. */
export function formatLearningHours(totalSeconds) {
  const hours = toNumber(totalSeconds) / 3600;
  return (Math.round(hours * 10) / 10).toFixed(1);
}

/** Amount + ISO currency, rendered LTR-safe. */
export function formatCurrency(amount, currency = 'USD') {
  const value = toNumber(amount).toFixed(2);
  return `${value} ${toText(currency, 'USD').toUpperCase()}`;
}

export function formatFileSize(sizeBytes) {
  const bytes = toNumber(sizeBytes);
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
}
