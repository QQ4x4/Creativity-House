import { getDictionary } from '@/i18n/getDictionary';
import StudentProfileClient from '@/components/dashboard/profile/StudentProfileClient';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: lang === 'ar' ? 'الملف الشخصي | دار الإبداع' : 'Profile | Creativity House',
    robots: { index: false, follow: false },
  };
}

export default async function ProfilePage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);

  return <StudentProfileClient dictionary={dictionary} lang={lang} />;
}
