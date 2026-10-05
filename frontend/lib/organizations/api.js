import { apiPost, getCsrfCookie } from '@/lib/api';
import { sanitizeInquiryText } from '@/lib/validations/organization';
import { FIELD_LIMITS } from '@/lib/fieldLimits';
import { getOrCreateAnonymousId } from '@/lib/tracking';

export const INQUIRY_ENDPOINT = '/v1/inquiries';

/**
 * @param {{
 *   name: string,
 *   company_name: string,
 *   email: string,
 *   phone: string,
 *   course_id?: string | number | null,
 *   message: string,
 *   event_id?: string,
 *   anonymous_id?: string | null,
 * }} data
 */
export async function submitOrganizationInquiry(data) {
  await getCsrfCookie();

  const payload = {
    type: 'organization',
    full_name: sanitizeInquiryText(data.name, FIELD_LIMITS.name),
    company_name: sanitizeInquiryText(data.company_name, FIELD_LIMITS.medium),
    email: sanitizeInquiryText(data.email, FIELD_LIMITS.email).toLowerCase(),
    phone_number: String(data.phone || '')
      .trim()
      .replace(/[^\d+]/g, '')
      .slice(0, FIELD_LIMITS.phone),
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

  return apiPost(INQUIRY_ENDPOINT, payload);
}
