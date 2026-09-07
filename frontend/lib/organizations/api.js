import { apiPost, getCsrfCookie } from '@/lib/api';
import { sanitizeInquiryText } from '@/lib/validations/organization';
import { FIELD_LIMITS } from '@/lib/fieldLimits';

export const ORGANIZATION_INQUIRY_ENDPOINT = '/v1/organization-inquiries';

/**
 * @param {{
 *   name: string,
 *   company_name: string,
 *   email: string,
 *   phone: string,
 *   course_id?: string | number | null,
 *   message: string,
 * }} data
 */
export async function submitOrganizationInquiry(data) {
  await getCsrfCookie();

  const payload = {
    name: sanitizeInquiryText(data.name, FIELD_LIMITS.name),
    company_name: sanitizeInquiryText(data.company_name, FIELD_LIMITS.medium),
    email: sanitizeInquiryText(data.email, FIELD_LIMITS.email).toLowerCase(),
    phone: String(data.phone || '')
      .trim()
      .replace(/[^\d+]/g, '')
      .slice(0, FIELD_LIMITS.phone),
    message: sanitizeInquiryText(data.message, FIELD_LIMITS.long),
  };

  const courseId = Number(data.course_id);
  if (Number.isFinite(courseId) && courseId > 0) {
    payload.course_id = courseId;
  }

  return apiPost(ORGANIZATION_INQUIRY_ENDPOINT, payload);
}
