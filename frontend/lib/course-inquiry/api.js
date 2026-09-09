import { apiPost, getCsrfCookie } from '@/lib/api';
import { sanitizeInquiryText } from '@/lib/validations/organization';
import { FIELD_LIMITS } from '@/lib/fieldLimits';

export const INQUIRY_ENDPOINT = '/v1/inquiries';

/**
 * @param {{
 *   name: string,
 *   email: string,
 *   phone?: string | null,
 *   course_id?: string | number | null,
 *   message: string,
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

  return apiPost(INQUIRY_ENDPOINT, payload);
}
