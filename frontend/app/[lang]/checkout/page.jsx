import { getDictionary } from '@/i18n/getDictionary';
import CheckoutClient from '@/components/checkout/CheckoutClient';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: lang === 'ar' ? 'إتمام الشراء | دار الإبداع' : 'Checkout | Creativity House',
    robots: { index: false, follow: false },
  };
}

export default async function CheckoutPage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);
  return <CheckoutClient dictionary={dictionary} lang={lang} />;
}
