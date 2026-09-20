/**
 * Stripe browser SDK bootstrap for Elements checkout.
 * Uses NEXT_PUBLIC_STRIPE_KEY only — never hardcode keys or mock mode flags.
 */

import { loadStripe } from '@stripe/stripe-js';

let stripePromise;

/**
 * Publishable key from Next.js public env (set in `.env.local` / Vercel).
 * @returns {string}
 */
export function getStripePublishableKey() {
  return String(process.env.NEXT_PUBLIC_STRIPE_KEY || '').trim();
}

/**
 * @returns {Promise<import('@stripe/stripe-js').Stripe | null> | null}
 */
export function getStripePromise() {
  const key = getStripePublishableKey();
  if (!key) {
    return null;
  }

  if (!stripePromise) {
    stripePromise = loadStripe(key);
  }

  return stripePromise;
}
