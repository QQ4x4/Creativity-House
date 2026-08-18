import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import CourseDetailClient from '@/components/catalog/CourseDetailClient';
import { PUBLIC_CATALOG, localizeCatalogCourse } from '@/lib/catalog/data';

export async function generateStaticParams() {
  const langs = ['en', 'ar'];
  return langs.flatMap((lang) =>
    PUBLIC_CATALOG.map((course) => ({ lang, courseId: course.slug }))
  );
}

export async function generateMetadata({ params }) {
  const { lang, courseId } = await params;
  const course = localizeCatalogCourse(
    PUBLIC_CATALOG.find((item) => item.slug === courseId),
    lang
  );
  const title = course
    ? `${course.title} | Creativity House`
    : lang === 'ar'
      ? 'الدورة | دار الإبداع'
      : 'Course | Creativity House';
  const description = course?.subtitle || '';
  const canonicalUrl = `${seoConfig.siteUrl}/${lang}/courses/${courseId}`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'x-default': `${seoConfig.siteUrl}/en/courses/${courseId}`,
        en: `${seoConfig.siteUrl}/en/courses/${courseId}`,
        ar: `${seoConfig.siteUrl}/ar/courses/${courseId}`,
      },
    },
  };
}

export default async function CourseDetailPage({ params }) {
  const { lang, courseId } = await params;
  const dictionary = await getDictionary(lang);
  return <CourseDetailClient dictionary={dictionary} lang={lang} slug={courseId} />;
}
