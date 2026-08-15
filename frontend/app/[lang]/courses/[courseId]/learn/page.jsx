import { getDictionary } from '@/i18n/getDictionary';
import LearnClient from '@/components/dashboard/learn/LearnClient';

export async function generateMetadata({ params }) {
  const { lang } = await params;
  return {
    title: lang === 'ar' ? 'مشاهدة الدورة | دار الإبداع' : 'Course Player | Creativity House',
    robots: { index: false, follow: false },
  };
}

export default async function CourseLearnPage({ params }) {
  const { lang, courseId } = await params;
  const dictionary = await getDictionary(lang);

  return <LearnClient dictionary={dictionary} lang={lang} courseId={courseId} />;
}
