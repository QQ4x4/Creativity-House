import { getDictionary } from '@/i18n/getDictionary';
import { seoConfig } from '@/config/seo';
import PaymentSuccessClient from '@/components/payment/PaymentSuccessClient';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const title = lang === 'ar' ? 'تم الدفع | دار الإبداع' : 'Payment successful | Creativity House';
  const description =
    lang === 'ar'
      ? 'شكرًا لك. تم تأكيد تسجيلك ويمكنك فتح دوراتك الآن.'
      : 'Thank you. Your enrollment is confirmed and your courses are ready.';
  const canonicalUrl = `${seoConfig.siteUrl}/${lang}/payment-success`;

  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: {
      canonical: canonicalUrl,
      languages: {
        'x-default': `${seoConfig.siteUrl}/en/payment-success`,
        en: `${seoConfig.siteUrl}/en/payment-success`,
        ar: `${seoConfig.siteUrl}/ar/payment-success`,
      },
    },
  };
}

export default async function PaymentSuccessPage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  return <PaymentSuccessClient dictionary={dictionary} lang={lang} />;
}
