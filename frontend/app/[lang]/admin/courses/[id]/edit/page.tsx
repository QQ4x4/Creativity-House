import { CourseEditorScreen } from '@/components/admin/course-editor/CourseEditorScreen';

export const metadata = {
  title: 'Edit course — Admin',
  robots: { index: false, follow: false },
};

export default async function AdminCourseEditPage({
  params,
}: {
  params: Promise<{ lang: string; id: string }>;
}) {
  const { lang, id } = await params;

  return <CourseEditorScreen courseId={id} lang={lang} />;
}
