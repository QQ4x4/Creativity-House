import { notFound } from 'next/navigation';
import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import CourseDetailClient from '@/components/catalog/CourseDetailClient';
import FaqSection from '@/components/seo/FaqSection';
import JsonLd from '@/components/seo/JsonLd';
import { PUBLIC_CATALOG } from '@/lib/catalog/data';
import { getPublicCourseServer } from '@/lib/catalog/server';
import {
  buildCourseDescription,
  buildCourseFaqItems,
  buildCourseJsonLd,
  buildCourseTitle,
  absoluteUrl,
} from '@/lib/catalog/courseSeo';

export async function generateStaticParams() {
  const langs = ['en', 'ar'];
  return langs.flatMap((lang) =>
    PUBLIC_CATALOG.map((course) => ({ lang, courseId: course.slug }))
  );
}

export async function generateMetadata({ params }) {
  const { lang, courseId } = await params;
  const course = await getPublicCourseServer(courseId, lang);
  const title = buildCourseTitle(course, lang);
  const description = buildCourseDescription(course, lang);
  const canonicalUrl = absoluteUrl(`/${lang}/courses/${courseId}`);
  const image =
    course?.coverImage || course?.cover_image
      ? absoluteUrl(course.coverImage || course.cover_image)
      : absoluteUrl(seoConfig.ogImage);

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'x-default': absoluteUrl(`/en/courses/${courseId}`),
        en: absoluteUrl(`/en/courses/${courseId}`),
        ar: absoluteUrl(`/ar/courses/${courseId}`),
      },
    },
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: seoConfig.siteName,
      locale: lang === 'ar' ? 'ar_SA' : 'en_US',
      type: 'website',
      images: [{ url: image, width: 1200, height: 630, alt: course?.title || seoConfig.siteName }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [image],
    },
  };
}

export default async function CourseDetailPage({ params }) {
  const { lang, courseId } = await params;
  const dictionary = await getDictionary(lang);
  const course = await getPublicCourseServer(courseId, lang);

  if (!course) {
    notFound();
  }

  const faqItems = buildCourseFaqItems(course, dictionary, lang);
  const jsonLd = buildCourseJsonLd({ course, lang, dictionary, faqItems });

  return (
    <>
      <JsonLd data={jsonLd} />
      <CourseDetailClient
        dictionary={dictionary}
        lang={lang}
        slug={courseId}
        initialCourse={course}
        faqSlot={
          <FaqSection
            title={dictionary.seoPages?.courseDetail?.faqTitle}
            items={faqItems}
            className="px-0 sm:px-0 lg:px-0"
          />
        }
      />
    </>
  );
}
