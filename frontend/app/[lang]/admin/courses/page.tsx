import { CourseListScreen } from '@/components/admin/CourseListScreen';

/**
 * Admin course list.
 *
 * Params are a Promise in Next.js 15 and must be awaited. Auth + data fetching
 * live entirely in the client (`CourseListScreen` / `AdminGuard`) so SSR never
 * hits the Laravel admin API without a browser session cookie.
 */

type PageProps = {
  params: Promise<{ lang: string }>;
};

export const metadata = {
  title: 'Courses — Admin',
  robots: { index: false, follow: false },
};

export default async function AdminCoursesPage({ params }: PageProps) {
  const { lang } = await params;

  return <CourseListScreen lang={lang} />;
}
