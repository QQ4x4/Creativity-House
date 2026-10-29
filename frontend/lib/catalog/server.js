/**
 * Server-only public course fetch for metadata + SSR course pages.
 * Never throws — returns null on error / 404.
 */

import { CATALOG_ENDPOINTS } from './endpoints';
import { normalizePublicCourse } from './api';
import { PUBLIC_CATALOG, localizeCatalogCourse } from './data';

function sanitizeEnvUrl(raw) {
  let value = String(raw || '').trim();
  if (!value) return '';
  value = value.replace(/^(?:NEXT_PUBLIC_[A-Z0-9_]+=)+/i, '');
  return value.trim();
}

function stripTrailingSlashes(url) {
  return sanitizeEnvUrl(url).replace(/\/+$/, '');
}

/** Absolute Laravel origin (same sanitising as lib/api.js / next.config.mjs). */
export function resolveBackendOrigin() {
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

function unwrapOne(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  return payload.data ?? payload.course ?? payload;
}

function fromStaticCatalog(slug, lang) {
  const row = PUBLIC_CATALOG.find((item) => item.slug === slug);
  if (!row) return null;
  return localizeCatalogCourse(row, lang);
}

/**
 * @param {string} slug
 * @param {string} lang
 * @returns {Promise<object|null>}
 */
export async function getPublicCourseServer(slug, lang = 'en') {
  const origin = resolveBackendOrigin();
  const path = CATALOG_ENDPOINTS.course(slug);
  const url = `${origin}/api${path.startsWith('/') ? path : `/${path}`}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      next: { revalidate: 300 },
      signal: controller.signal,
    });

    if (!res.ok) {
      return fromStaticCatalog(slug, lang);
    }

    const json = await res.json();
    const normalized = normalizePublicCourse(unwrapOne(json), lang);
    if (normalized) return normalized;
    return fromStaticCatalog(slug, lang);
  } catch {
    return fromStaticCatalog(slug, lang);
  } finally {
    clearTimeout(timer);
  }
}
