'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { fetchAdminCourse } from '@/lib/admin/api';
import type { AdminCourseDto } from '@/lib/admin/types';
import { CourseEditorForm } from './CourseEditorForm';

/** Matches the fallback in components/dashboard/learn/LessonPlayer.jsx. */
const DEFAULT_BUNNY_LIBRARY_ID = process.env.NEXT_PUBLIC_BUNNY_LIBRARY_ID || '739576';

interface CourseEditorScreenProps {
  courseId: string;
  lang: string;
}

/**
 * Loads the course over the authenticated Sanctum session, then hands it to the
 * form as `defaultValues`. The fetch is client-side because the admin API
 * relies on the browser's session cookie.
 */
export function CourseEditorScreen({ courseId, lang }: CourseEditorScreenProps) {
  const [course, setCourse] = useState<AdminCourseDto | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      setCourse(await fetchAdminCourse(courseId));
    } catch (caught) {
      const status = (caught as { status?: number })?.status;
      setError(
        status === 404
          ? 'That course does not exist.'
          : ((caught as { message?: string })?.message ?? 'Could not load the course.')
      );
      setCourse(null);
    } finally {
      setIsLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        Loading course…
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-3 text-center">
        <AlertTriangle className="h-9 w-9 text-amber-500" aria-hidden />
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Course unavailable</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <div className="mt-2 flex gap-2">
          <Button type="button" variant="secondary" onClick={() => void load()}>
            Retry
          </Button>
          <Button asChild variant="outline">
            <Link href={`/${lang}/admin/courses`}>All courses</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <CourseEditorForm
      // Remount on id change so RHF picks up fresh defaultValues.
      key={course.id}
      course={course}
      lang={lang}
      defaultLibraryId={DEFAULT_BUNNY_LIBRARY_ID}
    />
  );
}
