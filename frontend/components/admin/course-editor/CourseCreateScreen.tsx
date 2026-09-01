'use client';

import { CourseEditorForm } from './CourseEditorForm';

/** Matches the fallback in components/dashboard/learn/LessonPlayer.jsx. */
const DEFAULT_BUNNY_LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || '739576';

interface CourseCreateScreenProps {
  lang: string;
}

/** Renders the shared 5-tab editor with blank defaults for POST /api/v1/admin/courses. */
export function CourseCreateScreen({ lang }: CourseCreateScreenProps) {
  return <CourseEditorForm lang={lang} defaultLibraryId={DEFAULT_BUNNY_LIBRARY_ID} />;
}
