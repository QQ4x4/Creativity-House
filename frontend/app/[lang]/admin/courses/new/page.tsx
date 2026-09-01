import { CourseCreateScreen } from '@/components/admin/course-editor/CourseCreateScreen';

export const metadata = {
  title: 'New course — Admin',
  robots: { index: false, follow: false },
};

export default async function AdminCourseCreatePage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;

  return <CourseCreateScreen lang={lang} />;
}
