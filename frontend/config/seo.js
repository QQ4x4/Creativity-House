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
    title: 'Creativity House | PMP Certification & Professional Training',
    description:
      'Accredited PMP®, PMI-RMP®, and project management training from Creativity House. Interactive live cohorts, recorded academies, and exam simulators aligned with PMBOK® for professionals across the MENA region.',
    ogLocale: 'en_US',
  },
  ar: {
    title: 'دار الإبداع | دورات إدارة المشاريع الاحترافية',
    description:
      'دورات معتمدة في إدارة المشاريع وشهادات PMP® وPMI-RMP® من دار الإبداع. برامج تفاعلية مباشرة ومسجّلة ومحاكيات امتحان وفق منهجيات PMBOK® للمحترفين في الشرق الأوسط.',
    ogLocale: 'ar_SA',
  },

  /** JSON-LD Organization schema (language-independent) */
  jsonLd: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Creativity House',
    legalName: 'Creativity House Sdn Bhd',
    alternateName: 'دار الإبداع',
    description:
      'Accredited PMP® and professional project management training — live, recorded, and exam simulator programs.',
    url: 'https://creativity-house.com',
    logo: 'https://creativity-house.com/logo.png',
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
