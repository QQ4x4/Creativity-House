import { apiPost, getCsrfCookie } from '@/lib/api';
import { sanitizeInquiryText } from '@/lib/validations/organization';

export const COURSE_INQUIRY_ENDPOINT = '/v1/course-inquiries';

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
    name: sanitizeInquiryText(data.name, 255),
    email: sanitizeInquiryText(data.email, 255).toLowerCase(),
    message: sanitizeInquiryText(data.message, 5000),
  };

  const phone = String(data.phone || '')
    .trim()
    .replace(/[^\d+]/g, '')
    .slice(0, 20);
  if (phone) {
    payload.phone = phone;
  }

  const courseId = Number(data.course_id);
  if (Number.isFinite(courseId) && courseId > 0) {
    payload.course_id = courseId;
  }

  return apiPost(COURSE_INQUIRY_ENDPOINT, payload);
}
