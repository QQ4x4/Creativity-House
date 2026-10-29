import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import CourseInquiryClient from '@/components/course-inquiry/CourseInquiryClient';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title =
    lang === 'ar'
      ? 'استفسر عن دورات PMP وإدارة المشاريع | دار الإبداع'
      : 'Ask About PMP & Project Management Courses | Creativity House';
  const description =
    lang === 'ar'
      ? 'اسألنا عن دورات PMP® وإدارة المشاريع قبل التسجيل. نرد عادة خلال 24 ساعة حول المواعيد والمتطلبات والاختبار.'
      : 'Ask us anything about PMP® and project management courses before you enroll. We typically reply within 24 hours.';
  const canonicalUrl = `${seoConfig.siteUrl}/${lang}/course-inquiry`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'x-default': `${seoConfig.siteUrl}/en/course-inquiry`,
        en: `${seoConfig.siteUrl}/en/course-inquiry`,
        ar: `${seoConfig.siteUrl}/ar/course-inquiry`,
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
  };
}

export default async function CourseInquiryPage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  return <CourseInquiryClient dictionary={dictionary} lang={lang} />;
}
