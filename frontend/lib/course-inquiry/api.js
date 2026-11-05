import { apiPost, getCsrfCookie } from '@/lib/api';
import { sanitizeInquiryText } from '@/lib/validations/organization';
import { FIELD_LIMITS } from '@/lib/fieldLimits';
import { appendGoogleClickIds, getOrCreateAnonymousId } from '@/lib/tracking';

export const INQUIRY_ENDPOINT = '/v1/inquiries';

/**
 * @param {{
 *   name: string,
 *   email: string,
 *   phone: string,
 *   course_id?: string | number | null,
 *   message: string,
 *   event_id?: string,
 *   anonymous_id?: string | null,
 *   country?: string | null,
 * }} data
 */
export async function submitCourseInquiry(data) {
  await getCsrfCookie();

  const phone = String(data.phone || '')
    .trim()
    .replace(/[^\d+]/g, '')
    .slice(0, FIELD_LIMITS.phone);

  const payload = {
    type: 'user',
    full_name: sanitizeInquiryText(data.name, FIELD_LIMITS.name),
    email: sanitizeInquiryText(data.email, FIELD_LIMITS.email).toLowerCase(),
    phone_number: phone,
    message: sanitizeInquiryText(data.message, FIELD_LIMITS.long),
  };

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

  if (data.country) {
    payload.country = String(data.country).toUpperCase().slice(0, 2);
  }

  return apiPost(INQUIRY_ENDPOINT, appendGoogleClickIds(payload));
}
