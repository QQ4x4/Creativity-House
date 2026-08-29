/**
 * Public catalog API — live Laravel only.
 * Failures propagate; there is no silent static-catalog mock fallback.
 */

import { apiGet } from '@/lib/api';
import { CATALOG_ENDPOINTS } from './endpoints';
import { localizeCatalogCourse } from './data';

function unwrapList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
}

function unwrapOne(payload) {
  if (!payload || typeof payload !== 'object') return payload;
  return payload.data ?? payload.course ?? payload;
}

function normalizePublicCourse(raw, lang) {
  if (!raw) return null;
  if (raw.title && raw.slug && !raw.title_en) {
    return raw;
  }
  return localizeCatalogCourse(
    {
      ...raw,
      defaultMode: raw.defaultMode ?? raw.default_mode,
      availableModes: raw.availableModes ?? raw.available_modes,
      title_en: raw.title_en ?? raw.title,
      title_ar: raw.title_ar ?? raw.title,
      subtitle_en: raw.subtitle_en ?? raw.subtitle,
      subtitle_ar: raw.subtitle_ar ?? raw.subtitle,
      description_en: raw.description_en ?? raw.description,
      description_ar: raw.description_ar ?? raw.description,
      badge_en: raw.badge_en ?? raw.badge,
      badge_ar: raw.badge_ar ?? raw.badge,
      original_price: raw.original_price ?? raw.originalPrice ?? raw.price,
      students_count: raw.students_count ?? raw.studentsCount,
      duration_hours: raw.duration_hours ?? raw.durationHours,
      duration_label_en: raw.duration_label_en ?? raw.duration_label ?? raw.durationLabel,
      duration_label_ar: raw.duration_label_ar ?? raw.duration_label ?? raw.durationLabel,
      language_en: raw.language_en ?? raw.language,
      language_ar: raw.language_ar ?? raw.language,
      last_updated: raw.last_updated ?? raw.lastUpdated,
      cover_image: raw.cover_image ?? raw.cover_image_url ?? raw.coverImage,
      modes: raw.modes ?? raw.catalog_modes,
      curriculum: raw.curriculum,
      target_audience_en: raw.target_audience_en ?? raw.target_audience,
      target_audience_ar: raw.target_audience_ar ?? raw.target_audience,
      learning_outcomes_en: raw.learning_outcomes_en ?? raw.learning_outcomes,
      learning_outcomes_ar: raw.learning_outcomes_ar ?? raw.learning_outcomes,
      schedule_en: raw.schedule_en ?? raw.schedule,
      schedule_ar: raw.schedule_ar ?? raw.schedule,
    },
    lang
  );
}

export async function fetchPublicCatalog(lang = 'en') {
  const rows = unwrapList(await apiGet(CATALOG_ENDPOINTS.courses)).map((item) =>
    normalizePublicCourse(item, lang)
  );
  return { data: rows.filter(Boolean), source: 'api' };
}

export async function fetchPublicCourse(slug, lang = 'en') {
  const course = normalizePublicCourse(unwrapOne(await apiGet(CATALOG_ENDPOINTS.course(slug))), lang);
  return { data: course, source: 'api' };
}
