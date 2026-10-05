/**
 * Dual-tracking helpers: GTM dataLayer (client) + shared IDs for Meta CAPI (server).
 * Tracking failures must never interrupt checkout, forms, or page render.
 */

const ANONYMOUS_ID_KEY = 'ch_anonymous_id';
const PURCHASE_FIRED_KEY = 'ch_purchase_event_ids';

function safeUuid() {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {
    // fall through
  }
  // RFC4122-ish fallback for older browsers
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
 * Generate a fresh UUID v4 for form event_id deduplication.
 * @returns {string}
 */
export function createEventId() {
  return safeUuid();
}

/**
 * Push a GTM dataLayer event with shared event_id for Meta Pixel ↔ CAPI dedup.
 * Never throws.
 *
 * @param {string} eventName
 * @param {string} eventId
 * @param {Record<string, unknown>} [eventData]
 * @param {Record<string, unknown>} [userData]
 */
export function pushDataLayer(eventName, eventId, eventData = {}, userData = {}) {
  try {
    if (typeof window === 'undefined') return;

    window.dataLayer = window.dataLayer || [];

    const anonymousId = getOrCreateAnonymousId();
    const payload = {
      event: eventName,
      event_id: eventId,
      user_data: {
        anonymous_id: anonymousId,
        ...userData,
      },
      ...eventData,
    };

    window.dataLayer.push(payload);
  } catch {
    // Non-blocking: tracking must never break UX.
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
 * Client-side Purchase event for Stripe success / claim confirmation.
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
  currency = 'USD',
  items = [],
  userData = {},
}) {
  try {
    const id = String(sessionId || '').trim();
    if (!id) return;
    if (!claimPurchaseEventOnce(id)) return;

    const numericValue =
      value != null && Number.isFinite(Number(value)) ? Number(value) : undefined;

    pushDataLayer(
      'purchase',
      id,
      {
        ecommerce: {
          transaction_id: id,
          value: numericValue,
          currency: String(currency || 'USD').toUpperCase(),
          items: Array.isArray(items) ? items : [],
        },
      },
      userData
    );
  } catch {
    // ignore
  }
}
