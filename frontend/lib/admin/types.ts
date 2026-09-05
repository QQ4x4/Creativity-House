/**
 * Wire types for the Laravel admin API (`/api/v1/admin/*`).
 *
 * These mirror AdminCourseResource / AdminModuleResource / AdminLessonResource
 * exactly, in snake_case. The form works in its own shape (see schema.ts) and
 * converts at the boundary, so swapping this transport for NextCRM Server
 * Actions later only means reimplementing lib/admin/api.ts.
 */

export const DELIVERY_MODES = ['live', 'recorded', 'simulator'] as const;
export type DeliveryMode = (typeof DELIVERY_MODES)[number];

export const COURSE_CATEGORIES = ['live', 'recorded', 'simulators', 'materials'] as const;
export type CourseCategory = (typeof COURSE_CATEGORIES)[number];

/** Bilingual bullet list as stored in the JSON columns. */
export interface BilingualList {
  en: string[];
  ar: string[];
}

export interface CatalogModePricing {
  price?: number | null;
  original_price?: number | null;
  duration_en?: string | null;
  duration_ar?: string | null;
  features_en?: string[];
  features_ar?: string[];
}

export interface AdminLessonResourceDto {
  id: number | null;
  title: string;
  /** Upload vs external link. */
  type: 'file' | 'link';
  url: string;
  file_path?: string | null;
  file_size?: string | null;
  size_bytes?: number | null;
  sort_order?: number;
}

export interface AdminLessonDto {
  id: number;
  module_id: number | null;
  title: string;
  video_url: string | null;
  bunny_video_id: string | null;
  bunny_library_id: string | null;
  duration: number;
  is_locked: boolean;
  sort_order: number;
  resources: AdminLessonResourceDto[];
  /** Legacy mirror of resource URLs — prefer `resources`. */
  pdf_resource_urls?: string[];
}

export interface AdminModuleDto {
  id: number;
  title_en: string;
  title_ar: string | null;
  duration_label_en: string | null;
  duration_label_ar: string | null;
  sort_order: number;
  lessons: AdminLessonDto[];
}

export interface AdminCourseDto {
  id: number;

  title_en: string;
  title_ar: string | null;
  subtitle_en: string | null;
  subtitle_ar: string | null;
  slug: string;
  badge: string | null;
  badge_ar: string | null;
  category: CourseCategory | null;
  language_en: string | null;
  language_ar: string | null;
  level: string | null;

  is_published: boolean;
  is_public: boolean;
  sort_order: number;

  price: number;
  original_price: number | null;
  currency: string;
  available_modes: DeliveryMode[];
  default_mode: DeliveryMode | null;
  catalog_modes: Record<string, CatalogModePricing>;

  description_en: string | null;
  description_ar: string | null;
  schedule_en: string | null;
  schedule_ar: string | null;
  target_audience: BilingualList;
  learning_outcomes: BilingualList;

  cover_image: string | null;
  rating: number | null;
  students_count: number;
  total_hours: number | null;
  duration_label_en: string | null;
  duration_label_ar: string | null;
  last_updated_at: string | null;

  instructor_name: string | null;
  instructor_name_ar: string | null;
  instructor_title_en: string | null;
  instructor_title_ar: string | null;
  instructor_bio_en: string | null;
  instructor_bio_ar: string | null;
  instructor_photo: string | null;
  instructor_trained: string | null;
  instructor_countries: number | null;
  instructor_credentials: BilingualList;

  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string[];

  modules: AdminModuleDto[];
}

/** One video in the Bunny Stream library, reduced by the Laravel proxy. */
export interface BunnyVideo {
  guid: string;
  title: string;
  /** Seconds. */
  duration: number;
  status: number;
  is_ready: boolean;
  views: number;
  created_at: string | null;
  thumbnail_url: string | null;
  /** Bunny collection GUID, or null when the video is uncategorized. */
  collection_id: string | null;
}

/** One Bunny Stream collection (folder) for the media-library tabs. */
export interface BunnyCollection {
  guid: string;
  name: string;
  video_count: number;
}

export interface BunnyVideoListResult {
  configured: boolean;
  videos: BunnyVideo[];
  collections: BunnyCollection[];
  libraryId: string | null;
  total: number;
  /** Present when Bunny is unreachable or unconfigured. */
  message?: string;
}
