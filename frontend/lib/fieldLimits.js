/**
 * Canonical string length limits — keep in sync with backend/config/field_limits.php
 *
 * @type {Readonly<{
 *   email: number;
 *   phone: number;
 *   password: number;
 *   name: number;
 *   short: number;
 *   medium: number;
 *   long: number;
 *   url: number;
 *   recaptcha: number;
 *   otp: number;
 *   currency: number;
 *   slug: number;
 * }>}
 */
export const FIELD_LIMITS = Object.freeze({
  email: 254,
  /** E.164 (15 digits) + leading "+" */
  phone: 16,
  password: 64,
  name: 100,
  short: 100,
  medium: 255,
  long: 2000,
  url: 2048,
  recaptcha: 10000,
  otp: 12,
  currency: 3,
  slug: 255,
});

export function maxMessage(limit, lang = 'en') {
  if (lang === 'ar') {
    return `الحد الأقصى ${limit} حرفًا.`;
  }
  return `Maximum ${limit} characters allowed.`;
}
