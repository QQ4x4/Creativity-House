import { z } from 'zod';

import {
  COURSE_CATEGORIES,
  DELIVERY_MODES,
  type AdminCourseDto,
  type BilingualList,
} from './types';

/**
 * Zod schema for the whole course object, validated client-side before the
 * editor submits. It intentionally mirrors the Laravel FormRequests in
 * app/Http/Requests/Admin so both layers reject the same input.
 *
 * Two deliberate choices keep the React Hook Form types clean:
 *
 *  1. No `.default()` — `toFormValues()` always supplies every field, so the
 *     inferred input and output types stay identical and `useForm` needs only
 *     one generic.
 *  2. No `z.coerce` — number inputs convert in their `onChange`, so form state
 *     holds real numbers instead of strings.
 *
 * Bullet lists are modelled as `{ value: string }[]` rather than `string[]`
 * because useFieldArray needs object items to keep stable field ids while rows
 * are reordered or removed.
 */

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const bulletItemSchema = z.object({
  value: z.string().trim().min(1, 'Cannot be empty.').max(300, 'Keep this under 300 characters.'),
});

const bilingualBulletsSchema = z.object({
  en: z.array(bulletItemSchema),
  ar: z.array(bulletItemSchema),
});

export const lessonSchema = z.object({
  id: z.number().int().positive().nullable(),
  title: z.string().trim().min(1, 'Lesson title is required.').max(200),
  video_url: z.string().max(2048),
  bunny_video_id: z.string().max(64),
  bunny_library_id: z.string().max(32),
  duration: z
    .number()
    .int('Duration must be whole seconds.')
    .min(0, 'Duration cannot be negative.')
    .max(86400, 'Duration cannot exceed 24 hours.'),
  is_locked: z.boolean(),
  pdf_resource_urls: z.array(z.string().max(2048)),
});

export const moduleSchema = z.object({
  id: z.number().int().positive().nullable(),
  title_en: z.string().trim().min(1, 'Module title (EN) is required.').max(200),
  title_ar: z.string().max(200),
  duration_label_en: z.string().max(80),
  duration_label_ar: z.string().max(80),
  lessons: z.array(lessonSchema),
});

export const catalogModeSchema = z.object({
  price: z.number().min(0).nullable(),
  original_price: z.number().min(0).nullable(),
  duration_en: z.string().max(120),
  duration_ar: z.string().max(120),
  features_en: z.array(bulletItemSchema),
  features_ar: z.array(bulletItemSchema),
});

export const courseFormSchema = z
  .object({
    /* ─── General ──────────────────────────────────────────────────────── */
    title_en: z.string().trim().min(1, 'English title is required.').max(200),
    title_ar: z.string().max(200),
    subtitle_en: z.string().max(300),
    subtitle_ar: z.string().max(300),
    slug: z
      .string()
      .trim()
      .max(200)
      .refine(
        (val) => val === '' || SLUG_PATTERN.test(val),
        'Use lowercase letters, numbers and single hyphens only.'
      ),
    badge: z.string().max(80),
    badge_ar: z.string().max(80),
    category: z.enum(COURSE_CATEGORIES).nullable(),
    language_en: z.string().max(80),
    language_ar: z.string().max(80),
    level: z.string().max(40),

    is_published: z.boolean(),
    is_public: z.boolean(),

    /* ─── Pricing & modes ──────────────────────────────────────────────── */
    price: z.number().min(0, 'Price cannot be negative.').max(999999.99),
    original_price: z.number().min(0).max(999999.99).nullable(),
    currency: z.string().length(3, 'Use a 3-letter currency code.'),
    available_modes: z.array(z.enum(DELIVERY_MODES)),
    default_mode: z.enum(DELIVERY_MODES).nullable(),
    catalog_modes: z.record(z.string(), catalogModeSchema),

    /* ─── Marketing ────────────────────────────────────────────────────── */
    description_en: z.string().max(20000),
    description_ar: z.string().max(20000),
    schedule_en: z.string().max(20000),
    schedule_ar: z.string().max(20000),
    target_audience: bilingualBulletsSchema,
    learning_outcomes: bilingualBulletsSchema,

    /* ─── Media & stats ────────────────────────────────────────────────── */
    cover_image: z.string().max(2048),
    rating: z.number().min(0).max(5, 'Rating is out of 5.').nullable(),
    students_count: z.number().int().min(0),
    total_hours: z.number().min(0).nullable(),
    duration_label_en: z.string().max(80),
    duration_label_ar: z.string().max(80),
    last_updated_at: z.string(),

    /* ─── Instructor ───────────────────────────────────────────────────── */
    instructor_name: z.string().max(150),
    instructor_name_ar: z.string().max(150),
    instructor_title_en: z.string().max(200),
    instructor_title_ar: z.string().max(200),
    instructor_bio_en: z.string().max(5000),
    instructor_bio_ar: z.string().max(5000),
    instructor_photo: z.string().max(2048),
    instructor_trained: z.string().max(40),
    instructor_countries: z.number().int().min(0).max(500).nullable(),
    instructor_credentials: bilingualBulletsSchema,

    /* ─── SEO ──────────────────────────────────────────────────────────── */
    seo_title: z.string().max(200),
    seo_description: z.string().max(500),
    seo_keywords: z.array(bulletItemSchema),

    /* ─── Curriculum ───────────────────────────────────────────────────── */
    modules: z.array(moduleSchema),
  })
  .superRefine((values, ctx) => {
    if (
      values.original_price !== null &&
      values.original_price > 0 &&
      values.original_price < values.price
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['original_price'],
        message: 'Original price must be greater than or equal to the price.',
      });
    }

    if (values.default_mode && !values.available_modes.includes(values.default_mode)) {
      ctx.addIssue({
        code: 'custom',
        path: ['default_mode'],
        message: 'The default mode must be one of the available delivery modes.',
      });
    }

    if (values.is_public && !values.is_published) {
      ctx.addIssue({
        code: 'custom',
        path: ['is_public'],
        message: 'A course must be published before it can appear in the public catalog.',
      });
    }

    // A lesson with neither a Bunny video nor a fallback URL renders the
    // student player's "video unavailable" state, so flag the exact row.
    values.modules.forEach((module, moduleIndex) => {
      module.lessons.forEach((lesson, lessonIndex) => {
        if (!lesson.bunny_video_id.trim() && !lesson.video_url.trim()) {
          ctx.addIssue({
            code: 'custom',
            path: ['modules', moduleIndex, 'lessons', lessonIndex, 'bunny_video_id'],
            message: 'Pick a Bunny video or provide a fallback video URL.',
          });
        }
      });
    });
  });

export type CourseFormValues = z.infer<typeof courseFormSchema>;
export type ModuleFormValues = z.infer<typeof moduleSchema>;
export type LessonFormValues = z.infer<typeof lessonSchema>;

/** Blank editor defaults for POST /api/v1/admin/courses (create flow). */
export function defaultFormValues(): CourseFormValues {
  return {
    title_en: '',
    title_ar: '',
    subtitle_en: '',
    subtitle_ar: '',
    slug: '',
    badge: '',
    badge_ar: '',
    category: 'live',
    language_en: 'English & Arabic',
    language_ar: 'الإنجليزية والعربية',
    level: '',

    is_published: false,
    is_public: false,

    price: 0,
    original_price: null,
    currency: 'USD',
    available_modes: ['live'],
    default_mode: 'live',
    catalog_modes: {},

    description_en: '',
    description_ar: '',
    schedule_en: '',
    schedule_ar: '',
    target_audience: { en: [], ar: [] },
    learning_outcomes: { en: [], ar: [] },

    cover_image: '',
    rating: null,
    students_count: 0,
    total_hours: null,
    duration_label_en: '',
    duration_label_ar: '',
    last_updated_at: '',

    instructor_name: '',
    instructor_name_ar: '',
    instructor_title_en: '',
    instructor_title_ar: '',
    instructor_bio_en: '',
    instructor_bio_ar: '',
    instructor_photo: '',
    instructor_trained: '',
    instructor_countries: null,
    instructor_credentials: { en: [], ar: [] },

    seo_title: '',
    seo_description: '',
    seo_keywords: [],

    modules: [],
  };
}

/* ─── Boundary converters ────────────────────────────────────────────────── */

function toBullets(values: string[] | undefined): { value: string }[] {
  return (values ?? []).map((value) => ({ value }));
}

function fromBullets(items: { value: string }[] | undefined): string[] {
  return (items ?? []).map((item) => item.value.trim()).filter((value) => value !== '');
}

function bilingualToForm(list: BilingualList | undefined) {
  return {
    en: toBullets(list?.en),
    ar: toBullets(list?.ar),
  };
}

function bilingualToApi(list: { en: { value: string }[]; ar: { value: string }[] }): BilingualList {
  return {
    en: fromBullets(list.en),
    ar: fromBullets(list.ar),
  };
}

/** Empty strings become null so the API clears the column. */
function nullable(value: string | undefined): string | null {
  const trimmed = (value ?? '').trim();
  return trimmed === '' ? null : trimmed;
}

/**
 * Hydrate the form from the API payload. Every nullable text column becomes ''
 * so inputs stay controlled for the whole lifetime of the form.
 */
export function toFormValues(course: AdminCourseDto): CourseFormValues {
  return {
    title_en: course.title_en ?? '',
    title_ar: course.title_ar ?? '',
    subtitle_en: course.subtitle_en ?? '',
    subtitle_ar: course.subtitle_ar ?? '',
    slug: course.slug ?? '',
    badge: course.badge ?? '',
    badge_ar: course.badge_ar ?? '',
    category: course.category ?? null,
    language_en: course.language_en ?? '',
    language_ar: course.language_ar ?? '',
    level: course.level ?? '',

    is_published: Boolean(course.is_published),
    is_public: Boolean(course.is_public),

    price: course.price ?? 0,
    original_price: course.original_price ?? null,
    currency: course.currency || 'USD',
    available_modes: course.available_modes ?? [],
    default_mode: course.default_mode ?? null,
    catalog_modes: Object.fromEntries(
      Object.entries(course.catalog_modes ?? {}).map(([key, mode]) => [
        key,
        {
          price: mode?.price ?? null,
          original_price: mode?.original_price ?? null,
          duration_en: mode?.duration_en ?? '',
          duration_ar: mode?.duration_ar ?? '',
          features_en: toBullets(mode?.features_en),
          features_ar: toBullets(mode?.features_ar),
        },
      ])
    ),

    description_en: course.description_en ?? '',
    description_ar: course.description_ar ?? '',
    schedule_en: course.schedule_en ?? '',
    schedule_ar: course.schedule_ar ?? '',
    target_audience: bilingualToForm(course.target_audience),
    learning_outcomes: bilingualToForm(course.learning_outcomes),

    cover_image: course.cover_image ?? '',
    rating: course.rating ?? null,
    students_count: course.students_count ?? 0,
    total_hours: course.total_hours ?? null,
    duration_label_en: course.duration_label_en ?? '',
    duration_label_ar: course.duration_label_ar ?? '',
    last_updated_at: course.last_updated_at ?? '',

    instructor_name: course.instructor_name ?? '',
    instructor_name_ar: course.instructor_name_ar ?? '',
    instructor_title_en: course.instructor_title_en ?? '',
    instructor_title_ar: course.instructor_title_ar ?? '',
    instructor_bio_en: course.instructor_bio_en ?? '',
    instructor_bio_ar: course.instructor_bio_ar ?? '',
    instructor_photo: course.instructor_photo ?? '',
    instructor_trained: course.instructor_trained ?? '',
    instructor_countries: course.instructor_countries ?? null,
    instructor_credentials: bilingualToForm(course.instructor_credentials),

    seo_title: course.seo_title ?? '',
    seo_description: course.seo_description ?? '',
    seo_keywords: toBullets(course.seo_keywords),

    modules: (course.modules ?? []).map((module) => ({
      id: module.id,
      title_en: module.title_en ?? '',
      title_ar: module.title_ar ?? '',
      duration_label_en: module.duration_label_en ?? '',
      duration_label_ar: module.duration_label_ar ?? '',
      lessons: (module.lessons ?? []).map((lesson) => ({
        id: lesson.id,
        title: lesson.title ?? '',
        video_url: lesson.video_url ?? '',
        bunny_video_id: lesson.bunny_video_id ?? '',
        bunny_library_id: lesson.bunny_library_id ?? '',
        duration: lesson.duration ?? 0,
        is_locked: Boolean(lesson.is_locked),
        pdf_resource_urls: lesson.pdf_resource_urls ?? [],
      })),
    })),
  };
}

/** Course columns only — the curriculum tree is saved by its own endpoint. */
export function toCoursePayload(values: CourseFormValues): Record<string, unknown> {
  return {
    title_en: values.title_en.trim(),
    title_ar: nullable(values.title_ar),
    subtitle_en: nullable(values.subtitle_en),
    subtitle_ar: nullable(values.subtitle_ar),
    slug: values.slug.trim(),
    badge: nullable(values.badge),
    badge_ar: nullable(values.badge_ar),
    category: values.category,
    language_en: nullable(values.language_en),
    language_ar: nullable(values.language_ar),
    level: nullable(values.level),

    is_published: values.is_published,
    is_public: values.is_public,

    price: values.price,
    original_price: values.original_price,
    currency: values.currency.toUpperCase(),
    available_modes: values.available_modes,
    default_mode: values.default_mode,
    catalog_modes: Object.fromEntries(
      Object.entries(values.catalog_modes).map(([key, mode]) => [
        key,
        {
          price: mode.price,
          original_price: mode.original_price,
          duration_en: nullable(mode.duration_en),
          duration_ar: nullable(mode.duration_ar),
          features_en: fromBullets(mode.features_en),
          features_ar: fromBullets(mode.features_ar),
        },
      ])
    ),

    description_en: nullable(values.description_en),
    description_ar: nullable(values.description_ar),
    schedule_en: nullable(values.schedule_en),
    schedule_ar: nullable(values.schedule_ar),
    target_audience: bilingualToApi(values.target_audience),
    learning_outcomes: bilingualToApi(values.learning_outcomes),

    cover_image: nullable(values.cover_image),
    rating: values.rating,
    students_count: values.students_count,
    total_hours: values.total_hours,
    duration_label_en: nullable(values.duration_label_en),
    duration_label_ar: nullable(values.duration_label_ar),
    last_updated_at: nullable(values.last_updated_at),

    instructor_name: nullable(values.instructor_name),
    instructor_name_ar: nullable(values.instructor_name_ar),
    instructor_title_en: nullable(values.instructor_title_en),
    instructor_title_ar: nullable(values.instructor_title_ar),
    instructor_bio_en: nullable(values.instructor_bio_en),
    instructor_bio_ar: nullable(values.instructor_bio_ar),
    instructor_photo: nullable(values.instructor_photo),
    instructor_trained: nullable(values.instructor_trained),
    instructor_countries: values.instructor_countries,
    instructor_credentials: bilingualToApi(values.instructor_credentials),

    seo_title: nullable(values.seo_title),
    seo_description: nullable(values.seo_description),
    seo_keywords: fromBullets(values.seo_keywords),
  };
}

/** Whole-tree payload for PUT /courses/{id}/curriculum. */
export function toCurriculumPayload(values: CourseFormValues): Record<string, unknown> {
  return {
    modules: values.modules.map((module) => ({
      id: module.id,
      title_en: module.title_en.trim(),
      title_ar: nullable(module.title_ar),
      duration_label_en: nullable(module.duration_label_en),
      duration_label_ar: nullable(module.duration_label_ar),
      lessons: module.lessons.map((lesson) => ({
        id: lesson.id,
        title: lesson.title.trim(),
        video_url: nullable(lesson.video_url),
        bunny_video_id: nullable(lesson.bunny_video_id),
        bunny_library_id: nullable(lesson.bunny_library_id),
        duration: lesson.duration,
        is_locked: lesson.is_locked,
        pdf_resource_urls: lesson.pdf_resource_urls,
      })),
    })),
  };
}
