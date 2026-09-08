import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import LegalDocumentLayout from '@/components/legal/LegalDocumentLayout';
import TermsContent from '@/components/legal/TermsContent';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title =
    lang === 'ar'
      ? 'شروط الخدمة | دار الإبداع'
      : 'Terms of Service | Creativity House';
  const description =
    lang === 'ar'
      ? 'شروط وأحكام استخدام موقع ودورات ومنصات دار الإبداع.'
      : 'Terms governing your use of Creativity House websites, courses, and training platforms.';
  const canonicalUrl = `${seoConfig.siteUrl}/${lang}/terms`;

  return {
    title,
    description,
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'x-default': `${seoConfig.siteUrl}/en/terms`,
        en: `${seoConfig.siteUrl}/en/terms`,
        ar: `${seoConfig.siteUrl}/ar/terms`,
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

export default async function TermsOfServicePage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);

  return (
    <LegalDocumentLayout dictionary={dictionary} lang={lang}>
      <TermsContent lang={lang} />
    </LegalDocumentLayout>
  );
}
