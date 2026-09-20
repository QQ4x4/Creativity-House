import { getDictionary } from '@/i18n/getDictionary';
import ClaimClient from '@/components/checkout/ClaimClient';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title:
      lang === 'ar'
        ? 'تفعيل الحساب | دار الإبداع'
        : 'Activate account | Creativity House',
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutClaimPage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  return <ClaimClient dictionary={dictionary} lang={lang} />;
}
