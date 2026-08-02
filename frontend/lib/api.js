/**
 * lib/api.js — Global API Client for Creativity House
 *
 * Sanctum stateful SPA client. Works for:
 *  - Local:  http://localhost:8000
 *  - Live:   Vercel frontend → Railway Laravel
 *
 * Env (set on Vercel):
 *  NEXT_PUBLIC_BACKEND_URL=https://<railway-app>.up.railway.app
 *  NEXT_PUBLIC_API_URL=https://<railway-app>.up.railway.app/api
 *
 * If API_URL is omitted, it is derived from BACKEND_URL + "/api".
 * If API_URL is the Railway root (no /api), "/api" is appended automatically
 * so auth calls hit /api/auth/* instead of /auth/* (which 404s).
 */

function stripTrailingSlashes(url) {
  return String(url || '').trim().replace(/\/+$/, '');
}

/**
 * Resolve the Laravel JSON API base (must end with /api, never /api/v1 here).
 */
export function resolveApiBaseUrl() {
  const rawApi = process.env.NEXT_PUBLIC_API_URL;
  const rawBackend = process.env.NEXT_PUBLIC_BACKEND_URL;

  if (rawApi && String(rawApi).trim()) {
    let base = stripTrailingSlashes(rawApi);

    // Misconfig: .../api/v1 while routes are registered under /api
    base = base.replace(/\/api\/v\d+$/i, '/api');

    // Misconfig: Railway/app root without /api → would call /auth/login (404)
    if (!/\/api$/i.test(base)) {
      base = `${base}/api`;
    }

    return base;
  }

  const backend = stripTrailingSlashes(rawBackend || 'http://localhost:8000');
  return `${backend}/api`;
}

/**
 * Resolve the Laravel origin (no /api) for Sanctum CSRF + OAuth redirects.
 */
export function resolveBackendUrl() {
  const rawBackend = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (rawBackend && String(rawBackend).trim()) {
    return stripTrailingSlashes(rawBackend).replace(/\/api$/i, '');
  }

  return resolveApiBaseUrl().replace(/\/api$/i, '') || 'http://localhost:8000';
}

function joinApiUrl(endpoint) {
  const base = resolveApiBaseUrl();
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${base}${path}`;
}

/**
 * Custom API error class with structured error data.
 * Properties are enumerable so console/JSON show status/message/data
 * instead of an empty `{}`.
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
 * Read a browser cookie by name.
 */
function getCookie(name) {
  if (typeof document === 'undefined') return null;

  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`));

  if (!match) return null;

  return decodeURIComponent(match.split('=').slice(1).join('='));
}

/**
 * Core fetch wrapper with automatic headers, credentials, and error handling.
 */
async function apiFetch(endpoint, options = {}) {
  const url = joinApiUrl(endpoint);
  const method = (options.method || 'GET').toUpperCase();

  const defaultHeaders = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };

  // Sanctum SPA: send decoded XSRF-TOKEN on mutating requests
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const xsrf = getCookie('XSRF-TOKEN');
    if (xsrf) {
      defaultHeaders['X-XSRF-TOKEN'] = xsrf;
    }
  }

  const config = {
    credentials: 'include',
    cache: 'no-store',
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  };

  let response;
  try {
    response = await fetch(url, config);
  } catch (networkError) {
    throw new ApiError(
      networkError?.message
        ? `Network error: ${networkError.message}. Check NEXT_PUBLIC_API_URL / CORS / backend is reachable.`
        : 'Network error — could not reach the API.',
      0,
      { message: networkError?.message, url }
    );
  }

  if (!response.ok) {
    let errorData = null;

    try {
      errorData = await response.json();
    } catch {
      // Response body is not JSON
    }

    const fieldMessage = (() => {
      const errors = errorData?.errors;
      if (!errors || typeof errors !== 'object') return null;
      const first = Object.values(errors)[0];
      return Array.isArray(first) ? first[0] : first || null;
    })();

    const message =
      fieldMessage ||
      errorData?.message ||
      (response.status === 401
        ? 'Unauthorized — session expired or not authenticated.'
        : response.status === 403
          ? 'Forbidden — insufficient permissions.'
          : response.status === 404
            ? `API route not found (${method} ${url}). Ensure NEXT_PUBLIC_API_URL ends with /api.`
            : response.status === 419
              ? 'Session expired (CSRF). Refresh the page and try again.'
              : response.status === 422
                ? 'Validation failed. Check the highlighted fields.'
                : response.status === 500
                  ? 'Server Error — please try again later.'
                  : `Request failed with status ${response.status}`);

    throw new ApiError(message, response.status, { ...errorData, url });
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

/**
 * Fetch CSRF cookie from Sanctum before making stateful requests.
 */
export async function getCsrfCookie() {
  const backend = resolveBackendUrl();
  const url = `${backend}/sanctum/csrf-cookie`;

  let response;
  try {
    response = await fetch(url, {
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });
  } catch (networkError) {
    throw new ApiError(
      `CSRF cookie request failed (Failed to fetch). Check NEXT_PUBLIC_BACKEND_URL (${backend}), CORS FRONTEND_URL, and that Railway is up.`,
      0,
      { message: networkError?.message, url }
    );
  }

  if (!response.ok) {
    throw new ApiError(
      `CSRF cookie request failed with status ${response.status} (${url}).`,
      response.status,
      { url }
    );
  }
}

export function getBackendUrl() {
  return resolveBackendUrl();
}

export function getApiBaseUrl() {
  return resolveApiBaseUrl();
}

export function getGoogleOAuthUrl() {
  return `${resolveBackendUrl()}/auth/google/redirect`;
}

export async function apiGet(endpoint, options = {}) {
  return apiFetch(endpoint, {
    method: 'GET',
    ...options,
  });
}

export async function apiGetCached(endpoint, revalidateSeconds = 60) {
  return apiFetch(endpoint, {
    method: 'GET',
    next: { revalidate: revalidateSeconds },
  });
}

export async function apiPost(endpoint, data = {}) {
  return apiFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function apiPut(endpoint, data = {}) {
  return apiFetch(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function apiDelete(endpoint) {
  return apiFetch(endpoint, {
    method: 'DELETE',
  });
}
