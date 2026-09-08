import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import PrivacyContent from '@/components/legal/PrivacyContent';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title =
    lang === 'ar'
      ? 'سياسة الخصوصية | دار الإبداع'
      : 'Privacy Policy | Creativity House';
  const description =
    lang === 'ar'
      ? 'كيف تجمع دار الإبداع معلوماتك وتستخدمها وتحميها عند استخدام موقعنا ومنصة التدريب.'
      : 'How Creativity House collects, uses, and protects your information when you use our website and training platform.';
  const canonicalUrl = `${seoConfig.siteUrl}/${lang}/privacy`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'x-default': `${seoConfig.siteUrl}/en/privacy`,
        en: `${seoConfig.siteUrl}/en/privacy`,
        ar: `${seoConfig.siteUrl}/ar/privacy`,
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

export default async function PrivacyPolicyPage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);

  return (
    <LegalDocumentLayout dictionary={dictionary} lang={lang}>
      <PrivacyContent lang={lang} />
    </LegalDocumentLayout>
  );
}
