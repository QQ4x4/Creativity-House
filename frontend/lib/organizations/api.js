import { apiPost, getCsrfCookie } from '@/lib/api';
import { sanitizeInquiryText } from '@/lib/validations/organization';

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
    name: sanitizeInquiryText(data.name, 255),
    company_name: sanitizeInquiryText(data.company_name, 255),
    email: sanitizeInquiryText(data.email, 255).toLowerCase(),
    phone: String(data.phone || '')
      .trim()
      .replace(/[^\d+]/g, '')
      .slice(0, 20),
    message: sanitizeInquiryText(data.message, 5000),
  };

  const courseId = Number(data.course_id);
  if (Number.isFinite(courseId) && courseId > 0) {
    payload.course_id = courseId;
  }

  return apiPost(ORGANIZATION_INQUIRY_ENDPOINT, payload);
}
