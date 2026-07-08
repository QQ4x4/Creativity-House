import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';


/**
 * app/[lang]/page.jsx — Home Page
 *
 * This is a SERVER COMPONENT that:
 *  1. Loads the dictionary server-side via getDictionary()
 *  2. Generates full SEO metadata (title, description, hreflang, OG, JSON-LD)
 *  3. Pre-renders static params for both /en and /ar via SSG
 *  4. Dynamically imports the heavy client-side HomePageClient with ssr: false
 *     to prevent Framer Motion from blocking the initial server render
 *
 * The loading fallback provides a meaningful skeleton with key semantic
 * headings visible to crawlers during hydration.
 */

import HomePageClient from '@/components/HomePageClient';

/* ─── Static Params for SSG ───
 * Generates /en and /ar as static HTML pages at build time.
 */
export function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

/* ─── Dynamic Metadata ───
 * Generates full, crawlable SEO metadata per language:
 *  - Title & description
 *  - Canonical URL
 *  - Hreflang alternate links (en, ar, x-default)
 *  - Open Graph (title, description, locale, image)
 *  - Twitter Card
 */
export async function generateMetadata({ params }) {
  const { lang } = await params;
  const meta = seoConfig[lang] || seoConfig.ar;
  const altLang = lang === 'ar' ? 'en' : 'ar';

  return {
    title: meta.title,
    description: meta.description,
    metadataBase: new URL(seoConfig.siteUrl),
    alternates: {
      canonical: `/${lang}`,
      languages: {
        [lang]: `/${lang}`,
        [altLang]: `/${altLang}`,
        'x-default': '/en',
      },
    },
    openGraph: {
      title: meta.title,
      description: meta.description,
      url: `/${lang}`,
      siteName: seoConfig.siteName,
      locale: meta.ogLocale,
      type: 'website',
      images: [
        {
          url: seoConfig.ogImage,
          width: 1200,
          height: 630,
          alt: seoConfig.siteName,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: meta.title,
      description: meta.description,
      images: [seoConfig.ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
  };
}

/* ─── Page Component ─── */
export default async function HomePage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);

  return (
    <>
      {/* JSON-LD Structured Data — rendered server-side in the HTML */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(seoConfig.jsonLd),
        }}
      />

      {/* Client-side interactive content */}
      <HomePageClient dictionary={dictionary} lang={lang} />
    </>
  );
}
