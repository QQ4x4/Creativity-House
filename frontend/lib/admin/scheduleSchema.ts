import { z } from 'zod';

import { FIELD_LIMITS } from '@/lib/fieldLimits';

export const RECURRENCE_TYPES = ['once', 'custom_dates', 'weekly', 'monthly_days'] as const;
export const SCHEDULE_FORMATS = ['online', 'in_person', 'hybrid'] as const;
export const TIME_SLOTS = ['morning', 'afternoon', 'evening'] as const;
export const ENDS_TYPES = ['never', 'on_date', 'after_count'] as const;
export const MISSING_DAY_POLICIES = ['skip', 'last_day'] as const;
export const CTA_TYPES = ['enroll', 'inquiry'] as const;
export const EXCEPTION_STATUSES = ['modified', 'cancelled', 'sold_out'] as const;

const optionalString = (max: number) => z.string().max(max).nullable();

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const scheduleFormSchema = z
  .object({
    delivery_mode: z.enum(['live', 'recorded', 'simulator']).nullable(),
    title_en: optionalString(FIELD_LIMITS.medium),
    title_ar: optionalString(FIELD_LIMITS.medium),
    batch_number: z.number().int().min(1).nullable(),
    time_slot: z.enum(TIME_SLOTS).nullable(),
    format: z.enum(SCHEDULE_FORMATS),
    location_en: optionalString(FIELD_LIMITS.medium),
    location_ar: optionalString(FIELD_LIMITS.medium),
    timezone: z.string().min(1),
    start_time: z.string().regex(timeRegex, 'Use HH:MM'),
    end_time: z.string().regex(timeRegex, 'Use HH:MM'),
    duration_days: z.number().int().min(1).max(365),
    recurrence_type: z.enum(RECURRENCE_TYPES),
    starts_on: z.string().regex(dateRegex, 'Use YYYY-MM-DD'),
    // No .default() / .coerce / .transform — keep input===output for RHF.
    custom_dates: z.array(z.string().regex(dateRegex)).max(120),
    repeat_custom_monthly: z.boolean(),
    weekdays: z.array(z.number().int().min(0).max(6)).max(7),
    repeat_interval: z.number().int().min(1).max(12),
    month_days: z.array(z.number().int().min(1).max(31)).max(31),
    missing_day_policy: z.enum(MISSING_DAY_POLICIES),
    ends_type: z.enum(ENDS_TYPES),
    ends_on: z.string().regex(dateRegex).nullable(),
    max_occurrences: z.number().int().min(1).max(200).nullable(),
    price: z.number().min(0).nullable(),
    original_price: z.number().min(0).nullable(),
    promo_text_en: optionalString(FIELD_LIMITS.medium),
    promo_text_ar: optionalString(FIELD_LIMITS.medium),
    seats_total: z.number().int().min(1).max(100000).nullable(),
    show_seats_left: z.boolean(),
    enrollment_closes_hours: z.number().int().min(0).max(8760),
    cta_type: z.enum(CTA_TYPES),
    trainer_name_en: optionalString(FIELD_LIMITS.medium),
    trainer_name_ar: optionalString(FIELD_LIMITS.medium),
    trainer_title_en: optionalString(FIELD_LIMITS.medium),
    trainer_title_ar: optionalString(FIELD_LIMITS.medium),
    trainer_photo: optionalString(FIELD_LIMITS.url),
    use_course_instructor: z.boolean(),
    show_countdown: z.boolean(),
    is_featured: z.boolean(),
    is_active: z.boolean(),
    notes_en: optionalString(FIELD_LIMITS.long),
    notes_ar: optionalString(FIELD_LIMITS.long),
    sort_order: z.number().int().min(0),
  })
  .superRefine((data, ctx) => {
    if (data.duration_days === 1 && data.start_time >= data.end_time) {
      ctx.addIssue({
        code: 'custom',
        path: ['end_time'],
        message: 'End time must be after start time for a 1-day batch.',
      });
    }

    if (data.recurrence_type === 'custom_dates' && data.custom_dates.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['custom_dates'],
        message: 'Select at least one date.',
      });
    }

    if (data.recurrence_type === 'weekly' && data.weekdays.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['weekdays'],
        message: 'Select at least one weekday.',
      });
    }

    if (data.recurrence_type === 'monthly_days' && data.month_days.length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['month_days'],
        message: 'Select at least one day of the month.',
      });
    }

    if (data.ends_type === 'on_date' && !data.ends_on) {
      ctx.addIssue({
        code: 'custom',
        path: ['ends_on'],
        message: 'Set the end date.',
      });
    }

    if (
      data.ends_type === 'on_date' &&
      data.ends_on &&
      data.ends_on < data.starts_on
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['ends_on'],
        message: 'End date must be on or after the start date.',
      });
    }

    if (data.ends_type === 'after_count' && (data.max_occurrences == null || data.max_occurrences < 1)) {
      ctx.addIssue({
        code: 'custom',
        path: ['max_occurrences'],
        message: 'Set how many batches to generate.',
      });
    }

    if (
      data.original_price != null &&
      data.price != null &&
      data.original_price < data.price
    ) {
      ctx.addIssue({
        code: 'custom',
        path: ['original_price'],
        message: 'Original price must be ≥ price.',
      });
    }
  });

export type ScheduleFormValues = z.infer<typeof scheduleFormSchema>;

export const occurrenceFormSchema = z.object({
  status: z.enum(EXCEPTION_STATUSES),
  start_time: z.string().regex(timeRegex).nullable(),
  end_time: z.string().regex(timeRegex).nullable(),
  duration_days: z.number().int().min(1).max(365).nullable(),
  price: z.number().min(0).nullable(),
  original_price: z.number().min(0).nullable(),
  seats_total: z.number().int().min(1).max(100000).nullable(),
  batch_number: z.number().int().min(1).nullable(),
  trainer_name_en: optionalString(FIELD_LIMITS.medium),
  trainer_name_ar: optionalString(FIELD_LIMITS.medium),
  trainer_photo: optionalString(FIELD_LIMITS.url),
  note_en: optionalString(FIELD_LIMITS.medium),
  note_ar: optionalString(FIELD_LIMITS.medium),
});

export type OccurrenceFormValues = z.infer<typeof occurrenceFormSchema>;

/** Empty form for "Add schedule". */
export function defaultScheduleValues(
  timezone = 'Asia/Kuala_Lumpur'
): ScheduleFormValues {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  const startsOn = tomorrow.toISOString().slice(0, 10);

  return {
    delivery_mode: null,
    title_en: null,
    title_ar: null,
    batch_number: null,
    time_slot: null,
    format: 'online',
    location_en: null,
    location_ar: null,
    timezone,
    start_time: '09:00',
    end_time: '17:00',
    duration_days: 1,
    recurrence_type: 'once',
    starts_on: startsOn,
    custom_dates: [],
    repeat_custom_monthly: false,
    weekdays: [],
    repeat_interval: 1,
    month_days: [],
    missing_day_policy: 'skip',
    ends_type: 'never',
    ends_on: null,
    max_occurrences: null,
    price: null,
    original_price: null,
    promo_text_en: null,
    promo_text_ar: null,
    seats_total: null,
    show_seats_left: false,
    enrollment_closes_hours: 0,
    cta_type: 'enroll',
    trainer_name_en: null,
    trainer_name_ar: null,
    trainer_title_en: null,
    trainer_title_ar: null,
    trainer_photo: null,
    use_course_instructor: true,
    show_countdown: true,
    is_featured: false,
    is_active: true,
    notes_en: null,
    notes_ar: null,
    sort_order: 0,
  };
}

function toDateOnly(value: string | null | undefined, fallback: string | null = null): string | null {
  if (!value) return fallback;
  const sliced = String(value).slice(0, 10);
  return dateRegex.test(sliced) ? sliced : fallback;
}

function toTimeOnly(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback;
  const match = String(value).match(/(\d{1,2}):(\d{2})/);
  if (!match) return fallback;
  return `${match[1].padStart(2, '0')}:${match[2]}`;
}

function toIntList(value: Array<number | string> | null | undefined): number[] {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((item) => Number(item))
        .filter((n) => Number.isFinite(n))
    )
  );
}

function filled(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim() !== '';
}

/** Map an API schedule DTO into form values. */
export function scheduleToFormValues(dto: {
  delivery_mode?: string | null;
  title_en?: string | null;
  title_ar?: string | null;
  batch_number?: number | null;
  time_slot?: string | null;
  format?: string | null;
  location_en?: string | null;
  location_ar?: string | null;
  timezone?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  duration_days?: number | null;
  recurrence_type?: string | null;
  starts_on?: string | null;
  custom_dates?: string[] | null;
  repeat_custom_monthly?: boolean;
  weekdays?: Array<number | string> | null;
  repeat_interval?: number | null;
  month_days?: Array<number | string> | null;
  missing_day_policy?: string | null;
  ends_type?: string | null;
  ends_on?: string | null;
  max_occurrences?: number | null;
  price?: number | null;
  original_price?: number | null;
  promo_text_en?: string | null;
  promo_text_ar?: string | null;
  seats_total?: number | null;
  show_seats_left?: boolean;
  enrollment_closes_hours?: number | null;
  cta_type?: string | null;
  trainer_name_en?: string | null;
  trainer_name_ar?: string | null;
  trainer_title_en?: string | null;
  trainer_title_ar?: string | null;
  trainer_photo?: string | null;
  show_countdown?: boolean;
  is_featured?: boolean;
  is_active?: boolean;
  notes_en?: string | null;
  notes_ar?: string | null;
  sort_order?: number | null;
}): ScheduleFormValues {
  const base = defaultScheduleValues(dto.timezone || 'Asia/Kuala_Lumpur');
  // OFF whenever any trainer override was saved (name, title, or photo).
  const useCourseInstructor = !(
    filled(dto.trainer_name_en) ||
    filled(dto.trainer_name_ar) ||
    filled(dto.trainer_title_en) ||
    filled(dto.trainer_title_ar) ||
    filled(dto.trainer_photo)
  );

  return {
    ...base,
    delivery_mode: (dto.delivery_mode as ScheduleFormValues['delivery_mode']) ?? null,
    title_en: dto.title_en ?? null,
    title_ar: dto.title_ar ?? null,
    batch_number:
      dto.batch_number == null || Number.isNaN(Number(dto.batch_number))
        ? null
        : Number(dto.batch_number),
    time_slot: (dto.time_slot as ScheduleFormValues['time_slot']) ?? null,
    format: (dto.format as ScheduleFormValues['format']) || 'online',
    location_en: dto.location_en ?? null,
    location_ar: dto.location_ar ?? null,
    timezone: dto.timezone || 'Asia/Kuala_Lumpur',
    start_time: toTimeOnly(dto.start_time, '09:00'),
    end_time: toTimeOnly(dto.end_time, '17:00'),
    duration_days: Number(dto.duration_days ?? 1) || 1,
    recurrence_type: (dto.recurrence_type as ScheduleFormValues['recurrence_type']) || 'once',
    starts_on: toDateOnly(dto.starts_on, base.starts_on) || base.starts_on,
    custom_dates: (dto.custom_dates ?? [])
      .map((d) => toDateOnly(d))
      .filter((d): d is string => Boolean(d)),
    repeat_custom_monthly: Boolean(dto.repeat_custom_monthly),
    weekdays: toIntList(dto.weekdays),
    repeat_interval: Number(dto.repeat_interval ?? 1) || 1,
    month_days: toIntList(dto.month_days),
    missing_day_policy:
      (dto.missing_day_policy as ScheduleFormValues['missing_day_policy']) || 'skip',
    ends_type: (dto.ends_type as ScheduleFormValues['ends_type']) || 'never',
    ends_on: toDateOnly(dto.ends_on, null),
    max_occurrences:
      dto.max_occurrences == null || Number.isNaN(Number(dto.max_occurrences))
        ? null
        : Number(dto.max_occurrences),
    price:
      dto.price == null || Number.isNaN(Number(dto.price)) ? null : Number(dto.price),
    original_price:
      dto.original_price == null || Number.isNaN(Number(dto.original_price))
        ? null
        : Number(dto.original_price),
    promo_text_en: dto.promo_text_en ?? null,
    promo_text_ar: dto.promo_text_ar ?? null,
    seats_total:
      dto.seats_total == null || Number.isNaN(Number(dto.seats_total))
        ? null
        : Number(dto.seats_total),
    show_seats_left: Boolean(dto.show_seats_left),
    enrollment_closes_hours: Number(dto.enrollment_closes_hours ?? 0) || 0,
    cta_type: (dto.cta_type as ScheduleFormValues['cta_type']) || 'enroll',
    trainer_name_en: dto.trainer_name_en ?? null,
    trainer_name_ar: dto.trainer_name_ar ?? null,
    trainer_title_en: dto.trainer_title_en ?? null,
    trainer_title_ar: dto.trainer_title_ar ?? null,
    trainer_photo: dto.trainer_photo ?? null,
    use_course_instructor: useCourseInstructor,
    show_countdown: dto.show_countdown !== false,
    is_featured: Boolean(dto.is_featured),
    is_active: dto.is_active !== false,
    notes_en: dto.notes_en ?? null,
    notes_ar: dto.notes_ar ?? null,
    sort_order: Number(dto.sort_order ?? 0) || 0,
  };
}

/** Strip UI-only fields before POST/PUT. */
export function toSchedulePayload(values: ScheduleFormValues): Record<string, unknown> {
  const {
    use_course_instructor,
    trainer_name_en,
    trainer_name_ar,
    trainer_title_en,
    trainer_title_ar,
    trainer_photo,
    ...rest
  } = values;

  return {
    ...rest,
    delivery_mode: rest.delivery_mode || null,
    time_slot: rest.time_slot || null,
    ends_on: rest.ends_type === 'on_date' ? rest.ends_on : null,
    max_occurrences: rest.ends_type === 'after_count' ? rest.max_occurrences : null,
    price: rest.price === null || Number.isNaN(rest.price as number) ? null : rest.price,
    original_price:
      rest.original_price === null || Number.isNaN(rest.original_price as number)
        ? null
        : rest.original_price,
    seats_total:
      rest.seats_total === null || Number.isNaN(rest.seats_total as number)
        ? null
        : rest.seats_total,
    trainer_name_en: use_course_instructor ? null : trainer_name_en,
    trainer_name_ar: use_course_instructor ? null : trainer_name_ar,
    trainer_title_en: use_course_instructor ? null : trainer_title_en,
    trainer_title_ar: use_course_instructor ? null : trainer_title_ar,
    trainer_photo: use_course_instructor ? null : trainer_photo,
  };
}
