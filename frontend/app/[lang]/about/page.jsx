import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import AboutPageClient from '@/components/AboutPageClient';
import JsonLd from '@/components/seo/JsonLd';
import { buildFaqPageJsonLd } from '@/lib/seo/faqJsonLd';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;

  const meta = {
    en: {
      title: 'About Creativity House | PMI Authorized Training Partner',
      description:
        'Creativity House is a PMI Authorized Training Partner delivering PMP® and PMI-RMP® training in Arabic and English for professionals across the MENA region.',
    },
    ar: {
      title: 'عن دار الإبداع | شريك تدريب معتمد من PMI',
      description:
        'دار الإبداع شريك تدريب معتمد من PMI، تقدم دورات PMP® و PMI-RMP® باللغتين العربية والإنجليزية للمحترفين في منطقة الشرق الأوسط وشمال أفريقيا.',
    },
  };

  const pageMeta = meta[lang] ?? meta.en;
  const canonicalUrl = `${seoConfig.siteUrl}/${lang}/about`;

  return {
    title: pageMeta.title,
    description: pageMeta.description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'x-default': `${seoConfig.siteUrl}/en/about`,
        en: `${seoConfig.siteUrl}/en/about`,
        ar: `${seoConfig.siteUrl}/ar/about`,
      },
    },
    openGraph: {
      title: pageMeta.title,
      description: pageMeta.description,
      url: canonicalUrl,
      siteName: seoConfig.siteName,
      locale: lang === 'ar' ? 'ar_SA' : 'en_US',
      type: 'website',
      images: [{ url: seoConfig.ogImage, width: 1200, height: 630, alt: seoConfig.siteName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: pageMeta.title,
      description: pageMeta.description,
    },
  };
}

export default async function AboutPage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const faqLd = buildFaqPageJsonLd(dictionary.about_page?.faq);

  return (
    <>
      <JsonLd data={faqLd} />
      <AboutPageClient dictionary={dictionary} lang={lang} />
    </>
  );
}
