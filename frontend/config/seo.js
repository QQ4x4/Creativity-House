/**
 * Centralized SEO configuration for bilingual (EN/AR) support.
 *
 * Used by:
 *  - app/[lang]/layout.jsx → generateMetadata() for site-level defaults
 *  - app/[lang]/page.jsx  → generateMetadata() for page-level SEO + hreflang + JSON-LD
 *
 * Update `siteUrl` to the production domain before deploying.
 */

export const seoConfig = {
  /** Production domain — used for canonical URLs, hreflang, sitemap, robots */
  siteUrl: 'https://www.creativity-house.com',

  /** Site name for Open Graph */
  siteName: 'Creativity House',

  /** Default OG image (path relative to public/) */
  ogImage: '/logo.png',

  /** Per-language metadata */
  en: {
    title: 'PMP Certification Course & Training | Creativity House',
    description:
      'PMP® certification course from a PMI Authorized Training Partner. Live and recorded PMP training, exam simulators and 35 contact hours, in Arabic and English.',
    ogLocale: 'en_US',
  },
  ar: {
    title: 'دورة PMP وشهادة إدارة المشاريع المعتمدة | دار الإبداع',
    description:
      'دورة PMP® من شريك تدريب معتمد من PMI. تدريب مباشر ومسجّل ومحاكي اختبار و35 ساعة تدريبية معتمدة للحصول على شهادة PMP، باللغتين العربية والإنجليزية.',
    ogLocale: 'ar_SA',
  },

  /** JSON-LD Organization schema (language-independent) */
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Creativity House',
    legalName: 'Creativity House Sdn Bhd',
    alternateName: [
      'دار الإبداع',
      'دار الابداع',
      'منصة دار الإبداع',
      'دار ابداع',
      'بيت الابداع',
      'Creativity House Sdn Bhd',
      'House of Creativity',
    ],
    description:
      'PMI Authorized Training Partner (ATP) delivering accredited PMP® and professional project management training — live, recorded, and exam simulator programs.',
    url: 'https://www.creativity-house.com',
    logo: 'https://www.creativity-house.com/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+60178918602',
      contactType: 'customer service',
      availableLanguage: ['English', 'Arabic'],
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: 'Kuala Lumpur',
      addressCountry: 'MY',
    },
    sameAs: [
      'https://www.facebook.com/talaat.alawadhi.33',
      'https://www.instagram.com/the.creativity_house/',
      'https://www.youtube.com/@talaatalawadhi2050',
    ],
  },
};

/** Strip HTML tags and collapse whitespace for meta descriptions. */
export function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Trim to ~maxLen at a word boundary. */
export function trimMetaDescription(value, maxLen = 155) {
  const text = stripHtml(value);
  if (text.length <= maxLen) return text;
  const slice = text.slice(0, maxLen);
  const lastSpace = slice.lastIndexOf(' ');
  return `${(lastSpace > 80 ? slice.slice(0, lastSpace) : slice).trim()}…`;
}

export function brandSuffix(lang) {
  return lang === 'ar' ? 'دار الإبداع' : 'Creativity House';
}

export function ensureTitleLength(title, lang) {
  const t = String(title || '').trim();
  if (t.length >= 30) return t;
  const extra = lang === 'ar' ? ' – تدريب PMP®' : ' – PMP® Training';
  return `${t}${extra}`;
}
