/**
 * lib/api.js — Global API Client for Creativity House
 *
 * Provides a unified fetch wrapper for communicating with the
 * Laravel backend API via Sanctum stateful authentication.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

/**
 * Custom API error class with structured error data.
 */
export class ApiError extends Error {
  constructor(message, status, data = null) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
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
  const url = `${API_BASE_URL}${endpoint}`;
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
        ? `Network error: ${networkError.message}`
        : 'Network error — could not reach the API. Is the backend running on :8000?',
      0,
      { message: networkError?.message }
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
          : response.status === 419
            ? 'Session expired (CSRF). Refresh the page and try again.'
            : response.status === 422
              ? 'Validation failed. Check the highlighted fields.'
              : response.status === 500
                ? 'Server Error — please try again later.'
                : `Request failed with status ${response.status}`);

    throw new ApiError(message, response.status, errorData);
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
  await fetch(`${BACKEND_URL}/sanctum/csrf-cookie`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  });
}

export function getBackendUrl() {
  return BACKEND_URL;
}

export function getGoogleOAuthUrl() {
  return `${BACKEND_URL}/auth/google/redirect`;
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
