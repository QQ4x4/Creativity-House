import { getDictionary } from '@/i18n/getDictionary';
import ProfileClient from '@/components/auth/ProfileClient';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: lang === 'ar' ? 'الملف الشخصي | دار الإبداع' : 'Profile | Creativity House',
  };
}

export default async function ProfilePage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);

  return <ProfileClient dictionary={dictionary} lang={lang} />;
}
