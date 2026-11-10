import { apiGet } from '@/lib/api';

/**
 * Public Success Stories payload from GET /api/v1/success-stories.
 * @param {{ lang?: string, course?: string|number }} [opts]
 */
export async function fetchSuccessStories(opts = {}) {
  const query = new URLSearchParams();
  if (opts.lang) query.set('lang', opts.lang);
  if (opts.course != null && opts.course !== '') query.set('course', String(opts.course));
  const suffix = query.toString() ? `?${query}` : '';

  const payload = await apiGet(`/v1/success-stories${suffix}`);
  const data = payload?.data ?? payload ?? {};

  return {
    page: data.page ?? null,
    featured: data.featured ?? null,
    testimonials: Array.isArray(data.testimonials) ? data.testimonials : [],
  };
}
