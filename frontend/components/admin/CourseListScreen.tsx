'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Loader2, Pencil, Plus, Search } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { fetchAdminCourses } from '@/lib/admin/api';
import type { AdminCourseDto } from '@/lib/admin/types';

export function CourseListScreen({ lang }: { lang: string }) {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [courses, setCourses] = useState<AdminCourseDto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setIsLoading(true);
      setError(null);

      try {
        const rows = await fetchAdminCourses(debounced);
        if (!cancelled) setCourses(rows);
      } catch (caught) {
        if (!cancelled) {
          setError((caught as { message?: string })?.message ?? 'Could not load courses.');
          setCourses([]);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle>Courses</CardTitle>
          <CardDescription>Pick a course to edit its content and curriculum.</CardDescription>
        </div>
        <Button asChild size="sm">
          <Link href={`/${lang}/admin/courses/new`}>
            <Plus className="h-4 w-4" aria-hidden />
            Add Course
          </Link>
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search by title or slug…"
            className="ps-9"
            aria-label="Search courses"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            Loading courses…
          </div>
        ) : error ? (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            {error}
          </div>
        ) : courses.length === 0 ? (
          <p className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
            No courses matched.
          </p>
        ) : (
          <ul className="space-y-2">
            {courses.map((course) => (
              <li
                key={course.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 px-4 py-3 dark:border-white/10"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900 dark:text-white">
                    {course.title_en || 'Untitled course'}
                  </p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/5">
                      /{course.slug}
                    </code>
                    {course.is_published ? (
                      <Badge variant="success">Published</Badge>
                    ) : (
                      <Badge variant="secondary">Draft</Badge>
                    )}
                    {course.is_public ? <Badge>In catalog</Badge> : null}
                  </div>
                </div>

                <Button asChild size="sm" variant="outline">
                  <Link href={`/${lang}/admin/courses/${course.id}/edit`}>
                    <Pencil className="h-3.5 w-3.5" aria-hidden />
                    Edit
                  </Link>
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
