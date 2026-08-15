import { getDictionary } from '@/i18n/getDictionary';
import MyCoursesClient from '@/components/dashboard/courses/MyCoursesClient';

export async function generateStaticParams() {
  return [{ lang: 'en' }, { lang: 'ar' }];
}

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: lang === 'ar' ? 'دوراتي | دار الإبداع' : 'My Courses | Creativity House',
    robots: { index: false, follow: false },
  };
}

export default async function MyCoursesPage({ params }) {
  const { lang } = await params;
  const dictionary = await getDictionary(lang);

  return <MyCoursesClient dictionary={dictionary} lang={lang} />;
}
