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
  /** Production domain — used for canonical URLs and hreflang links */
  siteUrl: 'https://creativity-house.com',

  /** Site name for Open Graph */
  siteName: 'Creativity House',

  /** Default OG image (path relative to public/) */
  ogImage: '/logo.png',

  /** Per-language metadata */
  en: {
    title: 'Creativity House | Leading IT Solutions Provider in Malaysia',
    description:
      'Creativity House Sdn Bhd builds digital excellence. We design custom CRM systems, lean project management platforms (LPMS), AWS cloud migrations, and professional corporate IT training.',
    ogLocale: 'en_US',
  },
  ar: {
    title: 'دار الإبداع | الشركة الرائدة في حلول تكنولوجيا المعلومات في ماليزيا',
    description:
      'دار الإبداع تبني التميز الرقمي. نصمم أنظمة إدارة علاقات العملاء المخصصة ومنصات إدارة المشاريع والحلول السحابية والتدريب المؤسسي الاحترافي.',
    ogLocale: 'ar_SA',
  },

  /** JSON-LD Organization schema (language-independent) */
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Creativity House Sdn Bhd',
    alternateName: 'دار الإبداع',
    url: 'https://creativity-house.com',
    logo: 'https://creativity-house.com/logo.png',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+60-3-1234-5678',
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
