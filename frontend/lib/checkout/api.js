/**
 * Elements checkout + post-payment account claim APIs.
 */

import { apiGet, apiPost, getCsrfCookie } from '@/lib/api';

export const CREATE_PAYMENT_INTENT_ENDPOINT = '/v1/checkout/create-payment-intent';
export const CLAIM_INFO_ENDPOINT = '/v1/checkout/claim-info';
export const CLAIM_ACCOUNT_ENDPOINT = '/v1/auth/claim-account';
export const CLAIM_RESEND_ENDPOINT = '/v1/auth/claim-account/resend';

/**
 * @param {{
 *   courseId: number|string,
 *   mode?: string,
 *   email: string,
 *   name: string,
 *   phone: string,
 * }} data
 */
export async function createPaymentIntent(data) {
  await getCsrfCookie();

  const courseId = Number(data.courseId);
  if (!Number.isFinite(courseId) || courseId < 1) {
    throw new Error('A valid course is required to start checkout.');
  }

  const payload = {
    course_id: courseId,
    email: data.email,
    name: data.name,
    phone: data.phone,
  };

  if (data.mode) {
    payload.mode = data.mode;
  }

  return apiPost(CREATE_PAYMENT_INTENT_ENDPOINT, payload);
}

/**
 * @param {string} paymentIntentId
 */
export async function fetchClaimInfo(paymentIntentId) {
  const id = encodeURIComponent(String(paymentIntentId || '').trim());
  // Send both names — Stripe redirect uses `payment_intent`; our return_url uses `session_id`.
  return apiGet(
    `${CLAIM_INFO_ENDPOINT}?payment_intent=${id}&payment_intent_id=${id}&session_id=${id}`
  );
}

/**
 * @param {{
 *   paymentIntentId: string,
 *   code: string,
 *   password: string,
 *   passwordConfirmation: string,
 * }} data
 */
export async function claimAccount(data) {
  await getCsrfCookie();

  return apiPost(CLAIM_ACCOUNT_ENDPOINT, {
    payment_intent_id: data.paymentIntentId,
    code: data.code,
    password: data.password,
    password_confirmation: data.passwordConfirmation,
  });
}

/**
 * @param {{ paymentIntentId: string }} data
 */
export async function resendClaimCode(data) {
  await getCsrfCookie();

  return apiPost(CLAIM_RESEND_ENDPOINT, {
    payment_intent_id: data.paymentIntentId,
  });
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

  return apiPost('/v1/checkout', { course_id: id });
}
