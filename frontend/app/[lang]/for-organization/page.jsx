import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import ForOrganizationClient from '@/components/organizations/ForOrganizationClient';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title =
    lang === 'ar'
      ? 'للمؤسسات | دار الإبداع — التدريب المؤسسي'
      : 'For Organizations | Creativity House — Corporate Training';
  const description =
    lang === 'ar'
      ? 'تحدث مع مستشارينا لتطوير فريقك. مسارات تعلم مخصصة ودعم برنامج مخصص للمؤسسات.'
      : 'Transform your team with corporate training. Custom learning paths and dedicated support for organizations.';
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
  return <ForOrganizationClient dictionary={dictionary} lang={lang} />;
}
