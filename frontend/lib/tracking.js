/**
 * Dual-tracking helpers: GTM dataLayer (client) + shared IDs for Meta CAPI (server).
 * Tracking failures must never interrupt checkout, forms, or page render.
 */

import { parsePhoneNumberFromString } from 'libphonenumber-js';

const ANONYMOUS_ID_KEY = 'ch_anonymous_id';
const PURCHASE_FIRED_KEY = 'ch_purchase_event_ids';
const CHECKOUT_CONTEXT_KEY = 'ch_checkout_context';

function safeUuid() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Persistent anonymous user id (localStorage). Safe on SSR — returns null server-side.
 * @returns {string|null}
 */
export function getOrCreateAnonymousId() {
  if (typeof window === 'undefined') return null;

  try {
    const existing = window.localStorage.getItem(ANONYMOUS_ID_KEY);
    if (existing && String(existing).trim()) {
      return String(existing).trim();
    }
    const id = safeUuid();
    window.localStorage.setItem(ANONYMOUS_ID_KEY, id);
    return id;
  } catch {
    return safeUuid();
  }
}

/**
 * Generate a fresh UUID v4 for event_id deduplication.
 * @returns {string}
 */
export function createEventId() {
  return safeUuid();
}

/**
 * E.164 phone (`+9665…`): strips spaces, dashes, dots, and parentheses; `00` → `+`.
 * Numbers without a dial code are resolved against `defaultCountry` when given.
 *
 * @param {string|null|undefined} phone
 * @param {string} [defaultCountry] ISO 3166-1 alpha-2
 * @returns {string}
 */
export function normalizePhone(phone, defaultCountry) {
  let raw = String(phone || '').trim().replace(/[\s\-().]/g, '');
  if (!raw) return '';
  if (raw.startsWith('00')) raw = `+${raw.slice(2)}`;

  try {
    const parsed = raw.startsWith('+')
      ? parsePhoneNumberFromString(raw)
      : parsePhoneNumberFromString(raw, normalizeCountry(defaultCountry) || undefined);
    if (parsed?.number) return parsed.number;
  } catch {
    // fall through to digit-only fallback
  }

  const digits = raw.replace(/[^\d]/g, '');
  return digits ? `+${digits}` : '';
}

/**
 * @param {string|null|undefined} country
 * @returns {string} ISO 3166-1 alpha-2 (upper-case) or ''
 */
export function normalizeCountry(country) {
  const code = String(country || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : '';
}

/**
 * ISO country inferred from an international phone number's dial code.
 * @param {string|null|undefined} phone
 * @returns {string}
 */
export function countryFromPhone(phone) {
  const e164 = normalizePhone(phone);
  if (!e164) return '';
  try {
    return normalizeCountry(parsePhoneNumberFromString(e164)?.country);
  } catch {
    return '';
  }
}

/**
 * @param {string|null|undefined} fullName
 * @returns {{ firstName: string, lastName: string }}
 */
export function splitName(fullName) {
  const parts = String(fullName || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: '', lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

/**
 * Normalize raw form / account fields into the `userData` shape `pushDataLayer` expects.
 * Country falls back to the phone dial code when not supplied explicitly.
 *
 * @param {{
 *   email?: string|null,
 *   phone?: string|null,
 *   country?: string|null,
 *   name?: string|null,
 *   firstName?: string|null,
 *   lastName?: string|null,
 * }} input
 */
export function buildUserData({
  email,
  phone,
  country,
  name,
  firstName,
  lastName,
} = {}) {
  const explicitCountry = normalizeCountry(country);
  const e164 = normalizePhone(phone, explicitCountry);
  const split = splitName(name);

  return {
    email: String(email || '').trim().toLowerCase(),
    phone: e164,
    country: explicitCountry || countryFromPhone(e164),
    firstName: String(firstName || '').trim() || split.firstName,
    lastName: String(lastName || '').trim() || split.lastName,
  };
}

/**
 * Push a GTM dataLayer event using the strict shared schema. Never throws.
 *
 * @param {string} eventName
 * @param {string} [eventId] defaults to a fresh UUID
 * @param {Record<string, unknown>} [customData]
 * @param {{ email?: string, phone?: string, country?: string, firstName?: string, lastName?: string }} [userData]
 */
export function pushDataLayer(eventName, eventId, customData = {}, userData = {}) {
  try {
    if (typeof window === 'undefined') return;

    window.dataLayer = window.dataLayer || [];

    // GA4: clear the previous ecommerce object so items don't merge across events.
    if (customData && Object.prototype.hasOwnProperty.call(customData, 'ecommerce')) {
      window.dataLayer.push({ ecommerce: null });
    }

    window.dataLayer.push({
      event: eventName,
      event_id: eventId || createEventId(),
      user_data: {
        email: userData.email || '',
        phone: userData.phone || '',
        country: userData.country || '',
        first_name: userData.firstName || '',
        last_name: userData.lastName || '',
        anonymous_id: getOrCreateAnonymousId(),
      },
      ...customData,
    });
  } catch {
    // Non-blocking: tracking must never break UX.
  }
}

/**
 * GA4 item for a course.
 * @param {{ id?: unknown, slug?: string, title?: string }} course
 * @param {number|null|undefined} price
 * @param {string} [variant] delivery mode
 */
export function courseItem(course, price, variant) {
  const numeric = Number(price);
  return {
    item_id: String(course?.id ?? course?.slug ?? ''),
    item_name: course?.title || course?.slug || 'Course',
    item_category: 'Course',
    ...(variant ? { item_variant: variant } : {}),
    ...(Number.isFinite(numeric) ? { price: numeric } : {}),
    quantity: 1,
  };
}

/**
 * Persist billing + order context across the Stripe redirect (same tab → sessionStorage),
 * so the confirmation page can send full buyer details with Purchase.
 *
 * @param {string} paymentId Stripe payment_intent / session id
 * @param {{ userData?: object, value?: number|null, currency?: string, items?: object[] }} context
 */
export function saveCheckoutContext(paymentId, context) {
  const id = String(paymentId || '').trim();
  if (!id || typeof window === 'undefined') return;
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_CONTEXT_KEY);
    const all = raw ? JSON.parse(raw) : {};
    const store = all && typeof all === 'object' ? all : {};
    store[id] = { ...context, savedAt: Date.now() };
    window.sessionStorage.setItem(CHECKOUT_CONTEXT_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

/**
 * @param {string} paymentId
 * @returns {{ userData?: object, value?: number|null, currency?: string, items?: object[] } | null}
 */
export function readCheckoutContext(paymentId) {
  const id = String(paymentId || '').trim();
  if (!id || typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_CONTEXT_KEY);
    const store = raw ? JSON.parse(raw) : null;
    return store && typeof store === 'object' ? store[id] || null : null;
  } catch {
    return null;
  }
}

/**
 * Fire purchase once per Stripe session / payment_intent id (sessionStorage guard).
 * @param {string} sessionId
 * @returns {boolean} true if this call should fire the event
 */
export function claimPurchaseEventOnce(sessionId) {
  const id = String(sessionId || '').trim();
  if (!id || typeof window === 'undefined') return false;

  try {
    const raw = window.sessionStorage.getItem(PURCHASE_FIRED_KEY);
    const fired = raw ? JSON.parse(raw) : [];
    const list = Array.isArray(fired) ? fired.map(String) : [];
    if (list.includes(id)) return false;
    list.push(id);
    window.sessionStorage.setItem(PURCHASE_FIRED_KEY, JSON.stringify(list.slice(-50)));
    return true;
  } catch {
    return true;
  }
}

/**
 * Client-side Purchase. `sessionId` (Stripe id) is both event_id and transaction_id,
 * matching the server-side CAPI Purchase from the Stripe webhook.
 * Missing fields are filled from the context saved at begin_checkout.
 *
 * @param {{
 *   sessionId: string,
 *   value?: number|null,
 *   currency?: string|null,
 *   items?: Array<Record<string, unknown>>,
 *   userData?: Record<string, unknown>,
 * }} opts
 */
export function trackPurchase({
  sessionId,
  value = null,
  currency = null,
  items = [],
  userData = {},
}) {
  try {
    const id = String(sessionId || '').trim();
    if (!id) return;
    if (!claimPurchaseEventOnce(id)) return;

    const saved = readCheckoutContext(id) || {};
    const rawValue = value ?? saved.value;
    const numericValue =
      rawValue != null && Number.isFinite(Number(rawValue)) ? Number(rawValue) : undefined;
    const resolvedCurrency = String(currency || saved.currency || 'USD').toUpperCase();
    const resolvedItems =
      Array.isArray(items) && items.length > 0
        ? items
        : Array.isArray(saved.items)
          ? saved.items
          : [];

    const mergedUser = { ...(saved.userData || {}) };
    for (const [key, val] of Object.entries(userData || {})) {
      if (val) mergedUser[key] = val;
    }

    pushDataLayer(
      'Purchase',
      id,
      {
        transaction_id: id,
        value: numericValue,
        currency: resolvedCurrency,
        ecommerce: {
          transaction_id: id,
          value: numericValue,
          currency: resolvedCurrency,
          items: resolvedItems,
        },
      },
      mergedUser
    );
  } catch {
    // ignore
  }
}

const PENDING_AUTH_KEY = 'ch_pending_auth_event';

/**
 * Map an auth/API user object into pushDataLayer's userData shape.
 * @param {Record<string, unknown>|null|undefined} user
 */
export function userToTrackingData(user) {
  if (!user || typeof user !== 'object') return {};
  return buildUserData({
    email: user.email,
    phone: user.phone_number || user.phone,
    country: user.country || user.country_code,
    firstName: user.first_name || user.firstName,
    lastName: user.last_name || user.lastName,
    name: user.name,
  });
}

/**
 * Map logical auth kind → Meta/GA dataLayer event name (must match CAPI).
 * @param {'sign_up'|'login'|string} kind
 * @returns {'CompleteRegistration'|'Login'|null}
 */
export function authEventName(kind) {
  if (kind === 'sign_up' || kind === 'CompleteRegistration') return 'CompleteRegistration';
  if (kind === 'login' || kind === 'Login') return 'Login';
  return null;
}

/**
 * Fire CompleteRegistration / Login with a shared event_id for Meta CAPI dedup.
 * Returns the event_id that was pushed (so the same value can be sent to Laravel).
 *
 * @param {'sign_up'|'login'|'CompleteRegistration'|'Login'} kind
 * @param {string} method e.g. 'email' | 'google'
 * @param {Record<string, unknown>|null|undefined} user
 * @param {string} [eventId] reuse a pre-generated UUID
 * @returns {string} event_id
 */
export function trackAuthEvent(kind, method, user, eventId) {
  const id = eventId || createEventId();
  try {
    const eventName = authEventName(kind);
    if (!eventName) return id;
    pushDataLayer(
      eventName,
      id,
      { method: String(method || 'email') },
      userToTrackingData(user)
    );
  } catch {
    // non-blocking
  }
  return id;
}

/**
 * Stash an auth event to fire after OTP / Google OAuth return.
 * @param {{
 *   event: 'sign_up'|'login',
 *   method: string,
 *   user?: Record<string, unknown>,
 *   eventId?: string,
 *   skipClientFire?: boolean,
 * }} pending
 */
export function stashPendingAuthEvent(pending) {
  if (typeof window === 'undefined') return;
  try {
    if (!pending?.event) return;
    window.sessionStorage.setItem(
      PENDING_AUTH_KEY,
      JSON.stringify({
        event: pending.event,
        method: pending.method || 'email',
        user: pending.user || {},
        eventId: pending.eventId || null,
        // Register already fired CompleteRegistration; OTP should only fire Login.
        skipClientFire: Boolean(pending.skipClientFire),
        savedAt: Date.now(),
      })
    );
  } catch {
    // ignore
  }
}

/**
 * Read + clear a pending auth stash without firing.
 * @returns {{ event?: string, method?: string, user?: object, eventId?: string|null, skipClientFire?: boolean }|null}
 */
export function consumePendingAuthEvent() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.sessionStorage.getItem(PENDING_AUTH_KEY);
    window.sessionStorage.removeItem(PENDING_AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Consume + fire a pending auth event (OTP / Google handoff).
 * Falls back to `fallbackEvent` when nothing was stashed.
 *
 * @param {Record<string, unknown>|null|undefined} user
 * @param {'sign_up'|'login'} [fallbackEvent='login']
 * @param {string} [fallbackMethod='email']
 * @param {string} [eventId]
 * @returns {string} event_id used for the push (empty if skipped)
 */
export function flushPendingAuthEvent(
  user,
  fallbackEvent = 'login',
  fallbackMethod = 'email',
  eventId
) {
  try {
    const pending = consumePendingAuthEvent();
    if (pending?.skipClientFire) {
      return '';
    }

    const kind =
      pending?.event === 'sign_up' || pending?.event === 'login'
        ? pending.event
        : fallbackEvent;
    const method = pending?.method || fallbackMethod;
    const mergedUser = { ...(pending?.user || {}), ...(user || {}) };
    const id = eventId || pending?.eventId || createEventId();

    return trackAuthEvent(kind, method, mergedUser, id);
  } catch {
    return eventId || '';
  }
}
