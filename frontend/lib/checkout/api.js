/**
 * Public checkout API — billing + course only. Card PAN/CVC never leave the browser.
 */

import { apiPost, getCsrfCookie } from '@/lib/api';

export const CHECKOUT_ENDPOINT = '/v1/checkout';

/**
 * @param {{
 *   firstName: string,
 *   lastName: string,
 *   email: string,
 *   phoneNumber: string,
 *   country: string,
 *   courseId?: number | string | null,
 *   courseSlug: string,
 *   mode?: string | null,
 * }} data
 */
export async function processCheckout(data) {
  await getCsrfCookie();

  const payload = {
    first_name: data.firstName,
    last_name: data.lastName,
    email: data.email,
    phone_number: data.phoneNumber,
    country: data.country,
    course_slug: data.courseSlug,
    mode: data.mode || undefined,
  };

  const courseId = Number(data.courseId);
  if (Number.isFinite(courseId) && courseId > 0) {
    payload.course_id = courseId;
  }

  return apiPost(CHECKOUT_ENDPOINT, payload);
}

/**
 * Start a Stripe-hosted Checkout Session for a published course.
 * @param {number|string} courseId
 * @returns {Promise<{ success?: boolean, url?: string, data?: { id?: string, url?: string } }>}
 */
export async function createStripeCheckoutSession(courseId) {
  await getCsrfCookie();

  const id = Number(courseId);
  if (!Number.isFinite(id) || id < 1) {
    throw new Error('A valid course is required to start checkout.');
  }

  return apiPost(CHECKOUT_ENDPOINT, { course_id: id });
}
