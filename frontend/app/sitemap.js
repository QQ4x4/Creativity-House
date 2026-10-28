import { seoConfig } from '@/config/seo';
import { resolveAbsoluteBackendUrl } from '@/lib/api';

/** @typedef {{ url: string, lastModified?: Date | string, alternates?: { languages?: Record<string, string> } }} SitemapEntry */

const LOCALES = ['en', 'ar'];

/** Public marketing paths (no leading slash). Home is ''. */
const STATIC_PATHS = [
  '',
  'courses',
  'about',
  'for-organization',
  'course-inquiry',
  'privacy',
  'terms',
];

const REVALIDATE_SECONDS = 3600;

/**
 * Absolute URL with https + www, no trailing slash.
 * @param {string} path e.g. "en/courses" or ""
 */
function absoluteUrl(path = '') {
  const base = seoConfig.siteUrl.replace(/\/+$/, '');
  const clean = String(path || '').replace(/^\/+|\/+$/g, '');
  return clean ? `${base}/${clean}` : base;
}

/**
 * @param {string} pathWithoutLocale e.g. "courses" or "courses/pmp-live-training" or ""
 * @param {Date} [lastModified]
 * @returns {SitemapEntry[]}
 */
function bilingualEntries(pathWithoutLocale, lastModified = new Date()) {
  const suffix = String(pathWithoutLocale || '').replace(/^\/+|\/+$/g, '');

  return LOCALES.map((lang) => {
    const path = suffix ? `${lang}/${suffix}` : lang;
    const enPath = suffix ? `en/${suffix}` : 'en';
    const arPath = suffix ? `ar/${suffix}` : 'ar';

    return {
      url: absoluteUrl(path),
      lastModified,
      alternates: {
        languages: {
          en: absoluteUrl(enPath),
          ar: absoluteUrl(arPath),
          'x-default': absoluteUrl(enPath),
        },
      },
    };
  });
}

/**
 * Live public catalog — published + public only (API already filters).
 * Never throws; returns [] on failure.
 * @returns {Promise<string[]>}
 */
async function fetchPublicCourseSlugs() {
  const backend = resolveAbsoluteBackendUrl().replace(/\/+$/, '');
  const url = `${backend}/api/courses`;

  try {
    const response = await fetch(url, {
      next: { revalidate: REVALIDATE_SECONDS },
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) return [];

    const payload = await response.json();
    const rows = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : [];

    return rows
      .map((row) => (row && typeof row.slug === 'string' ? row.slug.trim() : ''))
      .filter(Boolean);
  } catch {
    return [];
  }
}

/** @returns {Promise<SitemapEntry[]>} */
export default async function sitemap() {
  const now = new Date();
  /** @type {SitemapEntry[]} */
  const entries = [];

  for (const path of STATIC_PATHS) {
    entries.push(...bilingualEntries(path, now));
  }

  const slugs = await fetchPublicCourseSlugs();
  for (const slug of slugs) {
    entries.push(...bilingualEntries(`courses/${slug}`, now));
  }

  return entries;
}
