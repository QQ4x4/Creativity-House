/**
 * Public catalog API contract.
 * Paths are relative to the Axios `/api` baseURL.
 *
 *   GET /api/courses           → public catalog (no auth)
 *   GET /api/courses/{slug}    → public course detail (no auth)
 */

const encode = (value) => encodeURIComponent(String(value));

export const CATALOG_ENDPOINTS = {
  courses: '/courses',
  course: (slug) => `/courses/${encode(slug)}`,
};
