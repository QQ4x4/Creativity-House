import { seoConfig } from '@/config/seo';

const DISALLOW = [
  '/*/admin',
  '/*/admin/',
  '/*/checkout',
  '/*/checkout/',
  '/*/payment-success',
  '/*/my-courses',
  '/*/profile',
  '/*/courses/*/learn',
  '/api/',
];

/** Explicitly named so AI crawlers are allowed (same policy as *). */
const AI_CRAWLERS = ['GPTBot', 'OAI-SearchBot', 'PerplexityBot', 'ClaudeBot', 'Google-Extended'];

/**
 * robots.txt — allow all crawlers (including AI bots); block private app areas.
 * @returns {import('next').MetadataRoute.Robots}
 */
export default function robots() {
  const host = seoConfig.siteUrl.replace(/\/+$/, '');

  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: DISALLOW },
      ...AI_CRAWLERS.map((userAgent) => ({
        userAgent,
        allow: '/',
        disallow: DISALLOW,
      })),
    ],
    sitemap: `${host}/sitemap.xml`,
    host,
  };
}
