import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import CourseCatalogClient from '@/components/catalog/CourseCatalogClient';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title =
    lang === 'ar'
      ? 'الدورات التدريبية | دار الإبداع'
      : 'Courses | Creativity House';
  const description =
    lang === 'ar'
      ? 'تصفح برامج PMP® و PMI-RMP® المباشرة والمسجّلة ومحاكيات الامتحان.'
      : 'Browse live, recorded, and simulator PMP® and PMI-RMP® programs.';
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
  };
}

export default async function CoursesPage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  return <CourseCatalogClient dictionary={dictionary} lang={lang} />;
}
