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

/** Per delivery-mode pricing tier from AdminCourseResource. */
export interface PricingTierDto {
  id?: number | null;
  mode: DeliveryMode;
  price: number;
  original_price: number | null;
  duration_hours: number;
  badge_text_en: string | null;
  badge_text_ar: string | null;
  features_en: string[];
  features_ar: string[];
  guarantee_title_en: string | null;
  guarantee_title_ar: string | null;
  guarantee_text_en: string | null;
  guarantee_text_ar: string | null;
  sort_order?: number;
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
  sub_module_id?: number | null;
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

export interface AdminSubModuleDto {
  id: number;
  module_id?: number | null;
  title_en: string;
  title_ar: string | null;
  sort_order: number;
  lessons: AdminLessonDto[];
}

export interface AdminModuleDto {
  id: number;
  title_en: string;
  title_ar: string | null;
  duration_label_en: string | null;
  duration_label_ar: string | null;
  sort_order: number;
  sub_modules?: AdminSubModuleDto[];
  /** Flattened BC mirror of all lessons under sub_modules. */
  lessons?: AdminLessonDto[];
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
  pricing_tiers?: PricingTierDto[];

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

/** One generated batch from ScheduleOccurrenceService (admin shape). */
export interface AdminOccurrenceDto {
  schedule_id: number;
  occurrence_date: string;
  start_at: string;
  end_at: string;
  timezone: string;
  utc_offset_label: string;
  local_start_date: string;
  local_end_date: string;
  start_time: string;
  end_time: string;
  duration_days: number;
  time_slot: string;
  format: string;
  location_en: string | null;
  location_ar: string | null;
  batch_number: number | null;
  /** Present on admin payloads when this date has an explicit override. */
  batch_number_override?: number | null;
  title_en: string | null;
  title_ar: string | null;
  delivery_mode: DeliveryMode | null;
  price: number;
  original_price: number | null;
  currency: string;
  discount_percent: number | null;
  promo_text_en: string | null;
  promo_text_ar: string | null;
  seats_total: number | null;
  seats_left: number | null;
  seats_taken?: number;
  show_seats_left: boolean;
  status: string;
  is_bookable: boolean;
  cta_type: 'enroll' | 'inquiry';
  show_countdown: boolean;
  is_featured: boolean;
  trainer: {
    name_en: string | null;
    name_ar: string | null;
    title_en: string | null;
    title_ar: string | null;
    photo: string | null;
  };
  /** Raw exception trainer fields only (never the course-instructor fallback). */
  trainer_override?: {
    name_en: string | null;
    name_ar: string | null;
    photo: string | null;
  } | null;
  note_en: string | null;
  note_ar: string | null;
  is_exception: boolean;
}

export interface AdminScheduleExceptionDto {
  id: number;
  course_schedule_id: number;
  occurrence_date: string;
  status: 'modified' | 'cancelled' | 'sold_out';
  start_time: string | null;
  end_time: string | null;
  duration_days: number | null;
  price: number | null;
  original_price: number | null;
  seats_total: number | null;
  batch_number: number | null;
  trainer_name_en: string | null;
  trainer_name_ar: string | null;
  trainer_photo: string | null;
  note_en: string | null;
  note_ar: string | null;
}

/** Course instructor fields used when "Use course instructor" is checked. */
export interface CourseInstructorPreview {
  instructor_name: string | null;
  instructor_name_ar: string | null;
  instructor_title_en: string | null;
  instructor_title_ar: string | null;
  instructor_photo: string | null;
}

/** Raw editable batch rule from AdminCourseScheduleResource. */
export interface AdminCourseScheduleDto {
  id: number;
  course_id: number;
  delivery_mode: DeliveryMode | null;
  title_en: string | null;
  title_ar: string | null;
  batch_number: number | null;
  time_slot: string | null;
  resolved_time_slot?: string;
  format: 'online' | 'in_person' | 'hybrid';
  location_en: string | null;
  location_ar: string | null;
  timezone: string;
  start_time: string;
  end_time: string;
  duration_days: number;
  recurrence_type: 'once' | 'custom_dates' | 'weekly' | 'monthly_days';
  starts_on: string;
  custom_dates: string[];
  repeat_custom_monthly: boolean;
  weekdays: number[];
  repeat_interval: number;
  month_days: number[];
  missing_day_policy: 'skip' | 'last_day';
  ends_type: 'never' | 'on_date' | 'after_count';
  ends_on: string | null;
  max_occurrences: number | null;
  price: number | null;
  original_price: number | null;
  promo_text_en: string | null;
  promo_text_ar: string | null;
  seats_total: number | null;
  show_seats_left: boolean;
  enrollment_closes_hours: number;
  cta_type: 'enroll' | 'inquiry';
  trainer_name_en: string | null;
  trainer_name_ar: string | null;
  trainer_title_en: string | null;
  trainer_title_ar: string | null;
  trainer_photo: string | null;
  show_countdown: boolean;
  is_featured: boolean;
  is_active: boolean;
  notes_en: string | null;
  notes_ar: string | null;
  sort_order: number;
  exceptions?: AdminScheduleExceptionDto[];
  next_occurrences?: AdminOccurrenceDto[];
  seats_sold?: number;
}

export type InquiryType = 'user' | 'organization';
export type InquiryStatus = 'unread' | 'read' | 'replied';

export interface InquiryDto {
  id: number;
  type: InquiryType;
  full_name: string;
  email: string;
  phone_number: string | null;
  company_name: string | null;
  target_course: string | null;
  message: string;
  status: InquiryStatus;
  replied_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}
