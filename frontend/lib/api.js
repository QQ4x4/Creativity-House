/**
 * lib/api.js — Global Axios API Client (Laravel Sanctum SPA)
 *
 * Local (WAMP): talks directly to http://localhost:8000 (readable cookies).
 * Production (Vercel → Railway): uses same-origin `/api` + `/sanctum` paths
 * so Next.js rewrites proxy to Railway. That makes XSRF-TOKEN a first-party
 * cookie on the Vercel domain — readable by JS and attachable as X-XSRF-TOKEN.
 *
 * Env (Vercel):
 *   NEXT_PUBLIC_BACKEND_URL=https://creativity-house-production.up.railway.app
 *   NEXT_PUBLIC_API_URL=/api
 *
 * Env (local WAMP):
 *   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
 *   NEXT_PUBLIC_API_URL=http://localhost:8000/api
 */

import axios from 'axios';

/**
 * Clean env URLs. Strips accidental "KEY=value" duplication pasted into Vercel/env files.
 * e.g. "NEXT_PUBLIC_API_URL=https://…" → "https://…"
 */
function sanitizeEnvUrl(raw) {
  let value = String(raw || '').trim();
  if (!value) return '';

  // Strip accidental KEY= prefix (common Vercel / .env paste mistake)
  value = value.replace(/^(?:NEXT_PUBLIC_[A-Z0-9_]+=)+/i, '');
  value = value.trim();

  return value;
}

function stripTrailingSlashes(url) {
  return sanitizeEnvUrl(url).replace(/\/+$/, '');
}

function isLocalHost(url) {
  return /localhost|127\.0\.0\.1/i.test(String(url || ''));
}

/**
 * Absolute Laravel origin from env (never rewritten). Used for OAuth redirects
 * and for Next.js rewrite destinations.
 */
export function resolveAbsoluteBackendUrl() {
  const rawBackend = sanitizeEnvUrl(process.env.NEXT_PUBLIC_BACKEND_URL);
  if (rawBackend) {
    return stripTrailingSlashes(rawBackend)
      .replace(/\/api\/v\d+$/i, '')
      .replace(/\/api$/i, '');
  }

  const rawApi = sanitizeEnvUrl(process.env.NEXT_PUBLIC_API_URL);
  if (rawApi && !rawApi.startsWith('/')) {
    return stripTrailingSlashes(rawApi)
      .replace(/\/api\/v\d+$/i, '')
      .replace(/\/api$/i, '');
  }

  return 'http://localhost:8000';
}

/**
 * Absolute API base from env before same-origin proxy adjustment.
 */
function resolveConfiguredApiBaseUrl() {
  const rawApi = sanitizeEnvUrl(process.env.NEXT_PUBLIC_API_URL);

  if (rawApi) {
    // Relative same-origin path (recommended on Vercel): `/api`
    if (rawApi.startsWith('/')) {
      return stripTrailingSlashes(rawApi) || '/api';
    }

    let base = stripTrailingSlashes(rawApi);
    base = base.replace(/\/api\/v\d+$/i, '/api');
    if (!/\/api$/i.test(base)) {
      base = `${base}/api`;
    }
    return base;
  }

  return `${resolveAbsoluteBackendUrl()}/api`;
}

/**
 * Should the browser call same-origin `/api` (via Next rewrites) instead of
 * the Railway origin directly? Required so document.cookie can read XSRF-TOKEN.
 */
function shouldUseSameOriginProxy(apiBase) {
  if (typeof window === 'undefined') return false;
  if (!apiBase) return false;

  // Explicit relative path — already same-origin
  if (apiBase.startsWith('/')) return true;

  if (isLocalHost(apiBase)) return false;

  try {
    return new URL(apiBase, window.location.origin).origin !== window.location.origin;
  } catch {
    // Malformed absolute URL → fall back to same-origin proxy
    return true;
  }
}

/**
 * API base used by Axios (same-origin `/api` when cross-domain in the browser).
 */
export function resolveApiBaseUrl() {
  const configured = resolveConfiguredApiBaseUrl();

  if (shouldUseSameOriginProxy(configured)) {
    return '/api';
  }

  return configured;
}

/**
 * Backend origin for Sanctum CSRF. Empty string ⇒ same-origin `/sanctum/...`.
 */
export function resolveBackendUrl() {
  const apiBase = resolveApiBaseUrl();

  if (apiBase.startsWith('/')) {
    return '';
  }

  if (shouldUseSameOriginProxy(apiBase)) {
    return '';
  }

  return apiBase.replace(/\/api$/i, '') || resolveAbsoluteBackendUrl();
}

/**
 * Custom API error class with structured, enumerable fields.
 */
export class ApiError extends Error {
  constructor(message, status = 0, data = null) {
    super(message);
    this.name = 'ApiError';

    Object.defineProperties(this, {
      message: {
        enumerable: true,
        configurable: true,
        writable: true,
        value: message,
      },
      status: {
        enumerable: true,
        configurable: true,
        writable: true,
        value: status,
      },
      data: {
        enumerable: true,
        configurable: true,
        writable: true,
        value: data,
      },
    });

    if (typeof Error.captureStackTrace === 'function') {
      Error.captureStackTrace(this, ApiError);
    }
  }

  toJSON() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      data: this.data,
    };
  }
}

/**
 * Read a browser cookie by name (first-party only).
 */
export function getCookie(name) {
  if (typeof document === 'undefined') return null;

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));

  if (!match) return null;

  return decodeURIComponent(match.split('=').slice(1).join('='));
}

/**
 * Global Axios instance — credentials + explicit cross-domain XSRF header.
 */
export const apiClient = axios.create({
  baseURL: typeof window === 'undefined' ? resolveConfiguredApiBaseUrl() : undefined,
  withCredentials: true,
  withXSRFToken: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
});

// Keep baseURL fresh (proxy vs absolute) on every request in the browser,
// unless the caller explicitly set baseURL (e.g. Sanctum CSRF on backend origin).
apiClient.interceptors.request.use((config) => {
  if (!config.baseURL) {
    config.baseURL = resolveApiBaseUrl();
  }
  config.withCredentials = true;

  // Cross-domain / modern Axios: always attach decoded XSRF-TOKEN manually.
  // Works locally (localhost cookies) and on Vercel when Next rewrites make
  // the XSRF cookie first-party on the frontend domain.
  const method = (config.method || 'get').toLowerCase();
  if (!['get', 'head', 'options'].includes(method)) {
    const xsrf = getCookie('XSRF-TOKEN');
    if (xsrf) {
      config.headers = config.headers || {};
      config.headers['X-XSRF-TOKEN'] = xsrf;
    }
  }

  return config;
});

function toApiError(error) {
  if (error instanceof ApiError) return error;

  if (error?.response) {
    const status = error.response.status;
    const errorData = error.response.data || null;
    const url = error.config
      ? `${error.config.baseURL || ''}${error.config.url || ''}`
      : undefined;

    const fieldMessage = (() => {
      const errors = errorData?.errors;
      if (!errors || typeof errors !== 'object') return null;
      const first = Object.values(errors)[0];
      return Array.isArray(first) ? first[0] : first || null;
    })();

    const message =
      fieldMessage ||
      errorData?.message ||
      (status === 401
        ? 'Unauthorized — session expired or not authenticated.'
        : status === 403
          ? 'Forbidden — insufficient permissions.'
          : status === 404
            ? `API route not found (${url || 'unknown URL'}). Auth JSON routes must be under /api/*; Sanctum CSRF must be /sanctum/csrf-cookie (not under /api).`
            : status === 419
              ? 'CSRF token mismatch (419). Refresh and ensure /sanctum/csrf-cookie runs before POST.'
              : status === 422
                ? 'Validation failed. Check the highlighted fields.'
                : status === 500
                  ? 'Server Error — please try again later.'
                  : `Request failed with status ${status}`);

    return new ApiError(message, status, { ...errorData, url });
  }

  return new ApiError(
    error?.message
      ? `Network error: ${error.message}. Check NEXT_PUBLIC_API_URL / CORS / backend is reachable.`
      : 'Network error — could not reach the API.',
    0,
    { message: error?.message }
  );
}

/**
 * Hit Sanctum CSRF endpoint before login/register/mutating auth calls.
 *
 * Uses a bare Axios call (NOT apiClient) so the `/api` baseURL can never
 * prepend onto `/sanctum/csrf-cookie`.
 *
 * - Local WAMP:  http://localhost:8000/sanctum/csrf-cookie
 * - Vercel / proxy:  /sanctum/csrf-cookie  (same-origin → next.config rewrite → Railway)
 */
export async function getCsrfCookie() {
  const backend = resolveBackendUrl();

  // Prefer relative path whenever we are in same-origin proxy mode.
  // Absolute URLs are only used for true local Laravel (localhost:8000).
  const csrfUrl = backend
    ? `${backend.replace(/\/+$/, '')}/sanctum/csrf-cookie`
    : '/sanctum/csrf-cookie';

  try {
    await axios.get(csrfUrl, {
      withCredentials: true,
      withXSRFToken: true,
      xsrfCookieName: 'XSRF-TOKEN',
      xsrfHeaderName: 'X-XSRF-TOKEN',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
      baseURL: '',
    });
  } catch (error) {
    const status = error?.response?.status || 0;
    const detail = error?.response?.data?.message || error?.message || '';
    throw new ApiError(
      `CSRF cookie request failed${status ? ` (${status})` : ''} at ${csrfUrl}. ${detail}`.trim(),
      status,
      {
        url: csrfUrl,
        data: error?.response?.data || null,
      }
    );
  }

  // Give the browser a tick to persist Set-Cookie before the next POST.
  if (typeof window !== 'undefined' && !getCookie('XSRF-TOKEN')) {
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

export function getBackendUrl() {
  return resolveBackendUrl() || resolveAbsoluteBackendUrl();
}

export function getApiBaseUrl() {
  return resolveApiBaseUrl();
}

export function getGoogleOAuthUrl() {
  // Always absolute Laravel URL — browser navigates off-site to Google via Railway.
  return `${resolveAbsoluteBackendUrl()}/auth/google/redirect`;
}

async function request(method, endpoint, data, config = {}) {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  try {
    const response = await apiClient.request({
      method,
      url: path,
      data,
      ...config,
    });

    if (response.status === 204) return null;
    return response.data;
  } catch (error) {
    throw toApiError(error);
  }
}

export async function apiGet(endpoint, options = {}) {
  return request('get', endpoint, undefined, options);
}

export async function apiGetCached(endpoint, revalidateSeconds = 60) {
  return request('get', endpoint, undefined, {
    headers: { 'Cache-Control': `max-age=${revalidateSeconds}` },
  });
}

export async function apiPost(endpoint, data = {}) {
  return request('post', endpoint, data);
}

export async function apiPut(endpoint, data = {}) {
  return request('put', endpoint, data);
}

export async function apiDelete(endpoint) {
  return request('delete', endpoint);
}
