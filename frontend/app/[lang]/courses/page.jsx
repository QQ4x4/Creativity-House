import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import CourseCatalogClient from '@/components/catalog/CourseCatalogClient';
import JsonLd from '@/components/seo/JsonLd';
import { buildFaqPageJsonLd } from '@/lib/seo/faqJsonLd';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title =
    lang === 'ar'
      ? 'دورات إدارة المشاريع PMP و PMI-RMP | دار الإبداع'
      : 'Project Management Courses: PMP & PMI-RMP | Creativity House';
  const description =
    lang === 'ar'
      ? 'تصفّح دورات PMP® و PMI-RMP®: دفعات مباشرة ودورات مسجّلة ومحاكيات اختبار. تدريب معتمد في إدارة المشاريع للمحترفين في الشرق الأوسط.'
      : 'Explore PMP® and PMI-RMP® courses: live cohorts, recorded academies and exam simulators. Accredited project management training for professionals in MENA.';
  const canonicalUrl = `${seoConfig.siteUrl}/${lang}/courses`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'x-default': `${seoConfig.siteUrl}/en/courses`,
        en: `${seoConfig.siteUrl}/en/courses`,
        ar: `${seoConfig.siteUrl}/ar/courses`,
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: seoConfig.siteName,
      locale: lang === 'ar' ? 'ar_SA' : 'en_US',
      type: 'website',
      images: [{ url: seoConfig.ogImage, width: 1200, height: 630, alt: seoConfig.siteName }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [seoConfig.ogImage],
    },
  };
}

export default async function CoursesPage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const faqLd = buildFaqPageJsonLd(dictionary.seoPages?.courses?.faq);

  return (
    <>
      <JsonLd data={faqLd} />
      <CourseCatalogClient dictionary={dictionary} lang={lang} />
    </>
  );
}
