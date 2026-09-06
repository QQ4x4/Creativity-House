'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm, type FieldErrors, type FieldPath } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BookOpen,
  DollarSign,
  ExternalLink,
  Loader2,
  Megaphone,
  RotateCcw,
  Save,
  Settings2,
  UserRound,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Form } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  courseFormSchema,
  defaultFormValues,
  toCoursePayload,
  toCurriculumPayload,
  toFormValues,
  type CourseFormValues,
} from '@/lib/admin/schema';
import {
  createAdminCourse,
  fetchAdminCourse,
  syncAdminCurriculum,
  updateAdminCourse,
} from '@/lib/admin/api';
import type { AdminCourseDto } from '@/lib/admin/types';
import { CurriculumTab } from './CurriculumTab';
import { GeneralTab } from './GeneralTab';
import { InstructorTab } from './InstructorTab';
import { MarketingTab } from './MarketingTab';
import { PricingTab } from './PricingTab';

const TABS = [
  { value: 'general', label: 'General', icon: Settings2 },
  { value: 'pricing', label: 'Pricing & modes', icon: DollarSign },
  { value: 'marketing', label: 'Marketing', icon: Megaphone },
  { value: 'instructor', label: 'Instructor', icon: UserRound },
  { value: 'curriculum', label: 'Curriculum', icon: BookOpen },
] as const;

/** Which tab owns each top-level form field, for the error badges. */
const FIELD_TAB: Record<string, (typeof TABS)[number]['value']> = {
  title_en: 'general',
  title_ar: 'general',
  subtitle_en: 'general',
  subtitle_ar: 'general',
  slug: 'general',
  badge: 'general',
  badge_ar: 'general',
  category: 'general',
  language_en: 'general',
  language_ar: 'general',
  level: 'general',
  last_updated_at: 'general',
  is_published: 'general',
  is_public: 'general',

  price: 'pricing',
  original_price: 'pricing',
  currency: 'pricing',
  available_modes: 'pricing',
  default_mode: 'pricing',
  catalog_modes: 'pricing',
  rating: 'pricing',
  students_count: 'pricing',
  total_hours: 'pricing',

  description_en: 'marketing',
  description_ar: 'marketing',
  schedule_en: 'marketing',
  schedule_ar: 'marketing',
  target_audience: 'marketing',
  learning_outcomes: 'marketing',
  cover_image: 'marketing',
  duration_label_en: 'marketing',
  duration_label_ar: 'marketing',
  seo_title: 'marketing',
  seo_description: 'marketing',
  seo_keywords: 'marketing',

  instructor_name: 'instructor',
  instructor_name_ar: 'instructor',
  instructor_title_en: 'instructor',
  instructor_title_ar: 'instructor',
  instructor_bio_en: 'instructor',
  instructor_bio_ar: 'instructor',
  instructor_photo: 'instructor',
  instructor_trained: 'instructor',
  instructor_countries: 'instructor',
  instructor_credentials: 'instructor',

  modules: 'curriculum',
};

interface CourseEditorFormProps {
  lang: string;
  defaultLibraryId: string;
  /** Omit for the create flow at /admin/courses/new. */
  course?: AdminCourseDto;
}

export function CourseEditorForm({ course, lang, defaultLibraryId }: CourseEditorFormProps) {
  const isCreate = !course;
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<string>('general');

  const form = useForm<CourseFormValues>({
    resolver: zodResolver(courseFormSchema),
    defaultValues: course ? toFormValues(course) : defaultFormValues(),
    mode: 'onBlur',
  });

  const {
    formState: { errors, isDirty, isSubmitting },
    reset,
    setError,
    handleSubmit,
  } = form;

  const errorsByTab = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(errors).forEach((key) => {
      const tab = FIELD_TAB[key];
      if (tab) counts[tab] = (counts[tab] ?? 0) + 1;
    });
    return counts;
  }, [errors]);

  // Browser-level guard; React state alone can't block a tab close.
  useEffect(() => {
    if (!isDirty) return;

    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [isDirty]);

  /** Map Laravel 422 errors back onto their fields so they surface inline. */
  const applyServerErrors = useCallback(
    (error: unknown): boolean => {
      const data = (error as { data?: { errors?: Record<string, string[] | string> } })?.data;
      const fieldErrors = data?.errors;

      if (!fieldErrors || typeof fieldErrors !== 'object') return false;

      let firstTab: string | null = null;

      Object.entries(fieldErrors).forEach(([field, messages]) => {
        const message = Array.isArray(messages) ? messages[0] : messages;
        if (!message) return;

        setError(field as FieldPath<CourseFormValues>, { type: 'server', message });

        const tab = FIELD_TAB[field.split('.')[0]];
        if (tab && !firstTab) firstTab = tab;
      });

      if (firstTab) setActiveTab(firstTab);

      return true;
    },
    [setError]
  );

  const onValid = useCallback(
    async (values: CourseFormValues) => {
      try {
        if (isCreate) {
          const created = await createAdminCourse(toCoursePayload(values));

          if (values.modules.length > 0) {
            await syncAdminCurriculum(created.id, toCurriculumPayload(values));
          }

          toast.success('Course created.');
          router.push(`/${lang}/admin/courses/${created.id}/edit`);
          return;
        }

        // Course columns first: if the slug collides, the curriculum is untouched.
        await updateAdminCourse(course.id, toCoursePayload(values));
        await syncAdminCurriculum(course.id, toCurriculumPayload(values));

        // Re-read so server-assigned module/lesson ids replace the nulls in
        // local state; otherwise the next save would recreate every new row.
        const fresh = await fetchAdminCourse(course.id);
        reset(toFormValues(fresh));

        toast.success('Course saved.');
      } catch (error) {
        const handled = applyServerErrors(error);
        toast.error(
          handled
            ? 'Some fields need attention.'
            : ((error as { message?: string })?.message ?? 'Could not save the course.')
        );
      }
    },
    [applyServerErrors, course, isCreate, lang, reset, router]
  );

  /** Reveal the first tab holding an error, but only on a failed submit. */
  const onInvalid = useCallback((formErrors: FieldErrors<CourseFormValues>) => {
    const firstKey = Object.keys(formErrors)[0];
    const tab = firstKey ? FIELD_TAB[firstKey] : null;
    if (tab) setActiveTab(tab);
    toast.error('Please fix the highlighted fields.');
  }, []);

  return (
    <Form {...form}>
      <form onSubmit={handleSubmit(onValid, onInvalid)} noValidate>
        {/* ─── Sticky action bar ─────────────────────────────────────────── */}
        <div className="sticky top-0 z-30 -mx-4 mb-6 border-b border-gray-200 bg-white/95 px-4 py-4 backdrop-blur-md dark:border-purple-500/20 dark:bg-[#120a1c]/95 sm:-mx-6 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <Link
                href={`/${lang}/admin/courses`}
                className="inline-flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-plum-700 dark:text-gray-400 dark:hover:text-gold-300"
              >
                <ArrowLeft className="h-3.5 w-3.5" aria-hidden />
                All courses
              </Link>
              <h1 className="mt-1 truncate text-xl font-extrabold text-gray-900 dark:text-white">
                {isCreate ? 'New course' : course.title_en || 'Untitled course'}
              </h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                {isCreate ? (
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/5">
                    Slug auto-generated if left blank
                  </span>
                ) : (
                  <code className="rounded bg-gray-100 px-1.5 py-0.5 dark:bg-white/5">
                    /{course.slug}
                  </code>
                )}
                {!isCreate && course.is_published ? (
                  <Badge variant="success">Published</Badge>
                ) : !isCreate ? (
                  <Badge variant="secondary">Draft</Badge>
                ) : (
                  <Badge variant="secondary">Draft</Badge>
                )}
                {!isCreate && course.is_public ? <Badge>In catalog</Badge> : null}
                {isDirty ? <Badge variant="warning">Unsaved changes</Badge> : null}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isCreate ? (
                <Button variant="ghost" size="sm" asChild>
                  <a
                    href={`/${lang}/courses/${course.slug}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden />
                    Preview
                  </a>
                </Button>
              ) : null}

              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => reset(course ? toFormValues(course) : defaultFormValues())}
                disabled={!isDirty || isSubmitting}
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                Discard
              </Button>

              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <Save className="h-4 w-4" aria-hidden />
                )}
                {isSubmitting
                  ? isCreate
                    ? 'Creating…'
                    : 'Saving…'
                  : isCreate
                    ? 'Create course'
                    : 'Save course'}
              </Button>
            </div>
          </div>
        </div>

        {/* ─── Tabs ──────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {TABS.map(({ value, label, icon: Icon }) => (
              <TabsTrigger key={value} value={value}>
                <Icon aria-hidden />
                <span className="hidden sm:inline">{label}</span>
                {errorsByTab[value] ? (
                  <span
                    aria-label={`${errorsByTab[value]} error${errorsByTab[value] === 1 ? '' : 's'}`}
                    className="ms-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-red-100 px-1 text-[10px] font-bold text-red-700 dark:bg-red-500/20 dark:text-red-300"
                  >
                    {errorsByTab[value]}
                  </span>
                ) : null}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="general">
            <GeneralTab />
          </TabsContent>

          <TabsContent value="pricing">
            <PricingTab />
          </TabsContent>

          <TabsContent value="marketing">
            <MarketingTab />
          </TabsContent>

          <TabsContent value="instructor">
            <InstructorTab />
          </TabsContent>

          <TabsContent value="curriculum">
            <CurriculumTab
              defaultLibraryId={defaultLibraryId}
              courseId={course?.id ?? 0}
            />
          </TabsContent>
        </Tabs>
      </form>
    </Form>
  );
}
