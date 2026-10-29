import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import ForOrganizationClient from '@/components/organizations/ForOrganizationClient';
import JsonLd from '@/components/seo/JsonLd';
import { buildFaqPageJsonLd } from '@/lib/seo/faqJsonLd';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title =
    lang === 'ar'
      ? 'تدريب الشركات على إدارة المشاريع و PMP | دار الإبداع'
      : 'Corporate PMP & Project Management Training | Creativity House';
  const description =
    lang === 'ar'
      ? 'طوّر فريقك مع تدريب الشركات في إدارة المشاريع و PMP®. مسارات تعلم مخصصة وجلسات مباشرة وتقارير متابعة لتقدم الموظفين.'
      : 'Upskill your team with corporate PMP® and project management training. Custom learning paths, live sessions and progress reporting for organizations.';
  const canonicalUrl = `${seoConfig.siteUrl}/${lang}/for-organization`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'x-default': `${seoConfig.siteUrl}/en/for-organization`,
        en: `${seoConfig.siteUrl}/en/for-organization`,
        ar: `${seoConfig.siteUrl}/ar/for-organization`,
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

export default async function ForOrganizationPage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  const faqLd = buildFaqPageJsonLd(dictionary.organizations?.faq);

  return (
    <>
      <JsonLd data={faqLd} />
      <ForOrganizationClient dictionary={dictionary} lang={lang} />
    </>
  );
}
