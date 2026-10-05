import { apiPost, getCsrfCookie } from '@/lib/api';
import { sanitizeInquiryText } from '@/lib/validations/organization';
import { FIELD_LIMITS } from '@/lib/fieldLimits';
import { getOrCreateAnonymousId } from '@/lib/tracking';

export const INQUIRY_ENDPOINT = '/v1/inquiries';

/**
 * @param {{
 *   name: string,
 *   email: string,
 *   phone?: string | null,
 *   course_id?: string | number | null,
 *   message: string,
 *   event_id?: string,
 *   anonymous_id?: string | null,
 * }} data
 */
export async function submitCourseInquiry(data) {
  await getCsrfCookie();

  const payload = {
    type: 'user',
    full_name: sanitizeInquiryText(data.name, FIELD_LIMITS.name),
    email: sanitizeInquiryText(data.email, FIELD_LIMITS.email).toLowerCase(),
    message: sanitizeInquiryText(data.message, FIELD_LIMITS.long),
  };

  const phone = String(data.phone || '')
    .trim()
    .replace(/[^\d+]/g, '')
    .slice(0, FIELD_LIMITS.phone);
  if (phone) {
    payload.phone_number = phone;
  }

  const courseId = Number(data.course_id);
  if (Number.isFinite(courseId) && courseId > 0) {
    payload.course_id = courseId;
  }

  if (data.event_id) {
    payload.event_id = String(data.event_id);
  }

  const anonymousId = data.anonymous_id || getOrCreateAnonymousId();
  if (anonymousId) {
    payload.anonymous_id = String(anonymousId);
  }

  return apiPost(INQUIRY_ENDPOINT, payload);
}
