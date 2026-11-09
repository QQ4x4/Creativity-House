'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { useForm, useFormState, useWatch } from 'react-hook-form';
import type { FieldPath, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format, parseISO } from 'date-fns';
import { AlertCircle, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import { ImageUploader } from '@/components/admin/ImageUploader';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  createAdminSchedule,
  previewAdminSchedule,
  updateAdminSchedule,
} from '@/lib/admin/api';
import {
  defaultScheduleValues,
  scheduleFormSchema,
  scheduleToFormValues,
  syncSessionsFromDates,
  toSchedulePayload,
  type ScheduleFormValues,
} from '@/lib/admin/scheduleSchema';
import type {
  AdminCourseScheduleDto,
  AdminOccurrenceDto,
  CourseInstructorPreview,
  DeliveryMode,
} from '@/lib/admin/types';
import { ApiError } from '@/lib/api';
import { cn } from '@/lib/utils';

import { CohortReviewPanel } from './CohortReviewPanel';
import { RecurrenceEditor } from './RecurrenceEditor';
import { ScheduleNumberInput } from './ScheduleNumberInput';
import { SchedulePreview } from './SchedulePreview';
import { SessionsEditor } from './SessionsEditor';

const PRIORITY_TIMEZONES = [
  'Asia/Kuala_Lumpur',
  'Asia/Riyadh',
  'Asia/Dubai',
  'Asia/Kuwait',
  'Asia/Qatar',
  'Asia/Bahrain',
  'Asia/Muscat',
  'Africa/Cairo',
  'Asia/Amman',
  'Europe/London',
  'UTC',
] as const;

const DEFAULT_COHORT_TIMEZONE = 'Asia/Riyadh';
const DEFAULT_COHORT_START = '19:30';
const DEFAULT_COHORT_END = '22:00';

const STEPS = [
  { id: 'batch', label: 'Batch' },
  { id: 'sessions', label: 'Sessions' },
  { id: 'review', label: 'Review' },
] as const;

type StepIndex = 0 | 1 | 2;
const LAST_STEP: StepIndex = 2;

type FormPath = FieldPath<ScheduleFormValues>;
type DeliveryFormat = ScheduleFormValues['format'];

const BATCH_STEP_FIELDS: FormPath[] = [
  'type',
  'batch_number',
  'title_en',
  'title_ar',
  'format',
  'delivery_mode',
  'location_en',
  'location_ar',
  'timezone',
  'start_time',
  'end_time',
  'price',
  'original_price',
  'seats_total',
  'enrollment_closes_at',
  'enrollment_closes_hours',
  'promo_text_en',
  'promo_text_ar',
  'show_seats_left',
  'cta_type',
  'show_countdown',
  'is_featured',
  'sort_order',
  'notes_en',
  'notes_ar',
];

const SESSION_STEP_FIELDS: FormPath[] = ['sessions', 'custom_dates', 'phases', 'starts_on'];
const SESSION_STEP_ROOTS = new Set<string>(['sessions', 'custom_dates', 'phases', 'starts_on']);

const FIELD_LABELS: Record<string, string> = {
  batch_number: 'Batch number',
  title_en: 'Label (EN)',
  title_ar: 'Label (AR)',
  format: 'Delivery',
  location_en: 'Platform / venue (EN)',
  location_ar: 'Platform / venue (AR)',
  timezone: 'Timezone',
  start_time: 'Start time',
  end_time: 'End time',
  duration_days: 'Batch length',
  price: 'Price',
  original_price: 'Original price',
  seats_total: 'Seats total',
  enrollment_closes_at: 'Enrollment closes',
  sessions: 'Sessions',
  custom_dates: 'Dates',
  weekdays: 'Weekdays',
  month_days: 'Days of month',
  starts_on: 'Start date',
  ends_on: 'End date',
  max_occurrences: 'Number of batches',
  notes_en: 'Notes (EN)',
  notes_ar: 'Notes (AR)',
};

interface ScheduleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: number;
  currency: string;
  availableModes: DeliveryMode[];
  schedule: AdminCourseScheduleDto | null;
  onSaved: () => void;
  /** Live instructor fields from the course form (Instructor tab). */
  courseInstructor?: CourseInstructorPreview | null;
  /** Next free batch number for create (max existing + 1). */
  suggestedBatchNumber?: number;
  /** Batch numbers already used by other batches of this course. */
  usedBatchNumbers?: number[];
}

interface FormErrorItem {
  path: string;
  message: string;
}

function allTimezones(): string[] {
  try {
    const supported =
      typeof Intl !== 'undefined' && 'supportedValuesOf' in Intl
        ? (Intl.supportedValuesOf('timeZone') as string[])
        : [];
    const set = new Set<string>([...PRIORITY_TIMEZONES, ...supported]);
    return Array.from(set);
  } catch {
    return [...PRIORITY_TIMEZONES];
  }
}

/** Flatten react-hook-form's nested error tree into `path → message` rows. */
function collectErrors(node: unknown, prefix = ''): FormErrorItem[] {
  if (!node || typeof node !== 'object') return [];
  const record = node as Record<string, unknown>;
  const out: FormErrorItem[] = [];

  if (prefix && typeof record.message === 'string' && record.message) {
    out.push({ path: prefix, message: record.message });
  }

  Object.entries(record).forEach(([key, value]) => {
    if (key === 'ref' || key === 'message' || key === 'type' || key === 'types') return;
    if (key === 'root') {
      out.push(...collectErrors(value, prefix));
      return;
    }
    out.push(...collectErrors(value, prefix ? `${prefix}.${key}` : key));
  });

  return out;
}

function stepForPath(path: string): StepIndex {
  const root = path.split('.')[0] ?? '';
  return SESSION_STEP_ROOTS.has(root) ? 1 : 0;
}

function errorLabel(path: string): string {
  const root = path.split('.')[0] ?? path;
  if (root === 'sessions' && path.includes('.')) {
    const index = Number(path.split('.')[1]);
    return Number.isFinite(index) ? `Session ${index + 1}` : 'Sessions';
  }
  return FIELD_LABELS[root] ?? root.replace(/_/g, ' ');
}

function todayYmd(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function computeCohortWarnings(values: ScheduleFormValues): string[] {
  const warnings: string[] = [];
  const sessions = values.sessions ?? [];
  if (sessions.length === 0) return warnings;

  const today = todayYmd();
  const past = sessions.filter((s) => s.date < today);
  if (past.length > 0) {
    warnings.push(
      `${past.length} session${past.length === 1 ? ' is' : 's are'} in the past (${past
        .slice(0, 3)
        .map((s) => s.date)
        .join(', ')}${past.length > 3 ? '…' : ''}).`
    );
  }

  const counts = new Map<number, number>();
  sessions.forEach((s) => {
    try {
      const dow = parseISO(s.date).getDay();
      counts.set(dow, (counts.get(dow) ?? 0) + 1);
    } catch {
      /* ignore invalid dates — schema reports them */
    }
  });
  if (counts.size > 1) {
    const parts = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([dow, n]) => `${WEEKDAY_NAMES[dow]} ×${n}`);
    warnings.push(`Sessions fall on different weekdays (${parts.join(', ')}). Check the dates.`);
  }

  const closes = values.enrollment_closes_at;
  if (closes) {
    const anchor = sessions[1] ?? sessions[0];
    const anchorNumber = sessions[1] ? 2 : 1;
    if (closes > anchor.date) {
      warnings.push(
        `Enrollment closes on ${closes}, after session ${anchorNumber} (${anchor.date}).`
      );
    }
  }

  return warnings;
}

interface ChoiceButtonProps {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}

function ChoiceButton({ active, onClick, children, className }: ChoiceButtonProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'min-h-11 cursor-pointer rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum-400/50',
        active
          ? 'border-plum-500 bg-plum-600 text-white'
          : 'border-gray-200 hover:border-plum-300 dark:border-white/10 dark:hover:border-plum-400/40',
        className
      )}
    >
      {children}
    </button>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">{children}</h3>
  );
}

type TextFieldName =
  | 'title_en'
  | 'title_ar'
  | 'location_en'
  | 'location_ar'
  | 'promo_text_en'
  | 'promo_text_ar'
  | 'notes_en'
  | 'notes_ar';

interface TextFieldProps {
  form: UseFormReturn<ScheduleFormValues>;
  name: TextFieldName;
  label: string;
  rtl?: boolean;
  placeholder?: string;
  textarea?: boolean;
  rows?: number;
  help?: string;
}

function TextField({ form, name, label, rtl, placeholder, textarea, rows = 2, help }: TextFieldProps) {
  // Uncontrolled register — keystrokes do not re-render sibling Controllers / the dialog shell.
  // useFormState({ name }) keeps error subscription scoped to this field only.
  // (Avoid FormLabel/FormControl here — they require FormField/Controller context.)
  const { errors } = useFormState({ control: form.control, name });
  const error = errors?.[name];
  const message =
    error && typeof error === 'object' && 'message' in error
      ? String((error as { message?: unknown }).message ?? '')
      : '';
  const registration = form.register(name, {
    setValueAs: (value) => (typeof value === 'string' && value === '' ? null : value),
  });

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      {textarea ? (
        <Textarea
          id={name}
          rows={rows}
          dir={rtl ? 'rtl' : undefined}
          placeholder={placeholder}
          {...registration}
        />
      ) : (
        <Input
          id={name}
          dir={rtl ? 'rtl' : undefined}
          placeholder={placeholder}
          {...registration}
        />
      )}
      {help ? <p className="text-xs text-gray-500 dark:text-gray-400">{help}</p> : null}
      {message ? (
        <p className="text-[0.8rem] font-medium text-destructive">{message}</p>
      ) : null}
    </div>
  );
}

interface ToggleRowProps {
  form: UseFormReturn<ScheduleFormValues>;
  name: 'is_active' | 'show_seats_left' | 'show_countdown' | 'is_featured';
  label: string;
}

function ToggleRow({ form, name, label }: ToggleRowProps) {
  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 dark:border-white/10">
          <FormLabel className="font-normal">{label}</FormLabel>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )}
    />
  );
}

interface ErrorSummaryProps {
  items: FormErrorItem[];
  onPick: (path: string) => void;
}

function ErrorSummary({ items, onPick }: ErrorSummaryProps) {
  if (items.length === 0) return null;
  return (
    <div
      role="alert"
      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-100"
    >
      <div className="flex items-center gap-2 font-semibold">
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden />
        Fix {items.length === 1 ? 'this issue' : `these ${items.length} issues`} to continue
      </div>
      <ul className="mt-2 list-disc space-y-1 ps-6">
        {items.map((item) => (
          <li key={`${item.path}:${item.message}`}>
            <button
              type="button"
              onClick={() => onPick(item.path)}
              className="cursor-pointer text-start underline underline-offset-2 hover:no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400/50"
            >
              <span className="font-semibold">{errorLabel(item.path)}:</span> {item.message}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface ExtraOptionsProps {
  form: UseFormReturn<ScheduleFormValues>;
  includeEnrollmentHours: boolean;
}

/** Promo / CTA / display options shared by both modes. */
function ExtraOptions({ form, includeEnrollmentHours }: ExtraOptionsProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField form={form} name="promo_text_en" label="Promo text (EN)" />
        <TextField form={form} name="promo_text_ar" label="Promo text (AR)" rtl />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleRow form={form} name="show_seats_left" label="Show seats left" />
        {includeEnrollmentHours ? (
          <FormField
            control={form.control}
            name="enrollment_closes_hours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Close enrollment (hours before)</FormLabel>
                <FormControl>
                  <ScheduleNumberInput field={field} min={0} max={8760} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}
      </div>
      <FormField
        control={form.control}
        name="cta_type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Call to action</FormLabel>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ['enroll', 'Enroll now (checkout)'],
                  ['inquiry', 'Request a seat (inquiry)'],
                ] as const
              ).map(([value, label]) => (
                <ChoiceButton
                  key={value}
                  active={field.value === value}
                  onClick={() => field.onChange(value)}
                >
                  {label}
                </ChoiceButton>
              ))}
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <ToggleRow form={form} name="show_countdown" label="Show countdown" />
        <ToggleRow form={form} name="is_featured" label="Featured card" />
      </div>
      <FormField
        control={form.control}
        name="sort_order"
        render={({ field }) => (
          <FormItem className="max-w-xs">
            <FormLabel>Sort order</FormLabel>
            <FormControl>
              <ScheduleNumberInput field={field} min={0} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}

interface TrainerSectionProps {
  form: UseFormReturn<ScheduleFormValues>;
  courseInstructor: CourseInstructorPreview | null;
  locale: 'en' | 'ar';
  useCourseInstructor: boolean;
}

function TrainerSection({ form, courseInstructor, locale, useCourseInstructor }: TrainerSectionProps) {
  const [photoFailed, setPhotoFailed] = useState(false);
  const photo = courseInstructor?.instructor_photo || null;

  useEffect(() => {
    setPhotoFailed(false);
  }, [photo]);

  const name =
    locale === 'ar'
      ? courseInstructor?.instructor_name_ar || courseInstructor?.instructor_name || null
      : courseInstructor?.instructor_name || courseInstructor?.instructor_name_ar || null;
  const title =
    locale === 'ar'
      ? courseInstructor?.instructor_title_ar || courseInstructor?.instructor_title_en || null
      : courseInstructor?.instructor_title_en || courseInstructor?.instructor_title_ar || null;
  const initials =
    (name || '?')
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || '?';
  const showPhoto = Boolean(photo) && !photoFailed;

  return (
    <section className="space-y-4">
      <SectionTitle>Trainer</SectionTitle>
      <FormField
        control={form.control}
        name="use_course_instructor"
        render={({ field }) => (
          <FormItem className="flex items-center gap-3 space-y-0">
            <FormControl>
              <Checkbox
                checked={field.value}
                onCheckedChange={(v) => {
                  const useCourse = Boolean(v);
                  field.onChange(useCourse);
                  if (useCourse) {
                    const opts = { shouldDirty: true, shouldValidate: true } as const;
                    form.setValue('trainer_name_en', null, opts);
                    form.setValue('trainer_name_ar', null, opts);
                    form.setValue('trainer_title_en', null, opts);
                    form.setValue('trainer_title_ar', null, opts);
                    form.setValue('trainer_photo', null, opts);
                  }
                }}
              />
            </FormControl>
            <FormLabel className="font-normal">Use default instructor</FormLabel>
          </FormItem>
        )}
      />
      {useCourseInstructor ? (
        <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3 dark:border-white/10 dark:bg-white/5">
          {name || photo ? (
            <div className="flex items-center gap-3">
              {showPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo ?? ''}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <span
                  aria-hidden
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-plum-100 text-xs font-bold text-plum-800 dark:bg-plum-500/20 dark:text-plum-100"
                >
                  {initials}
                </span>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                  {name || 'Dr. Talaat Al-Awadhi'}
                </div>
                {title ? (
                  <div className="truncate text-xs text-gray-500 dark:text-gray-400">{title}</div>
                ) : (
                  <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {locale === 'ar' ? 'مدرب معتمد من PMI®' : 'PMI® Authorized Instructor'}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Default: Dr. Talaat Al-Awadhi / د. طلعت العواضي — set the Instructor tab if empty.
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Edit the default instructor in the Instructor tab
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            {(
              [
                ['trainer_name_en', 'Name (EN)', false],
                ['trainer_name_ar', 'Name (AR)', true],
                ['trainer_title_en', 'Title (EN)', false],
                ['trainer_title_ar', 'Title (AR)', true],
              ] as const
            ).map(([fieldName, label, rtl]) => (
              <FormField
                key={fieldName}
                control={form.control}
                name={fieldName}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{label}</FormLabel>
                    <FormControl>
                      <Input
                        dir={rtl ? 'rtl' : undefined}
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || null)}
                        onBlur={field.onBlur}
                        name={field.name}
                        ref={field.ref}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            ))}
          </div>
          <FormField
            control={form.control}
            name="trainer_photo"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Photo</FormLabel>
                <ImageUploader
                  variant="avatar"
                  label="Upload trainer photo"
                  value={field.value}
                  onUploaded={(url) =>
                    form.setValue('trainer_photo', url, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                  onCleared={() =>
                    form.setValue('trainer_photo', null, {
                      shouldDirty: true,
                      shouldValidate: true,
                    })
                  }
                />
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}
    </section>
  );
}

interface TimezoneFieldProps {
  form: UseFormReturn<ScheduleFormValues>;
  zones: string[];
  timezone: string;
}

function TimezoneField({ form, zones, timezone }: TimezoneFieldProps) {
  return (
    <FormField
      control={form.control}
      name="timezone"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Timezone</FormLabel>
          <Select value={field.value} onValueChange={field.onChange}>
            <FormControl>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
            </FormControl>
            <SelectContent className="max-h-72">
              {zones.map((zone) => (
                <SelectItem key={zone} value={zone}>
                  {zone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {timezone === 'Asia/Riyadh' ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Shown to students as Makkah time (GMT+3)
            </p>
          ) : null}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

export function ScheduleDialog({
  open,
  onOpenChange,
  courseId,
  currency,
  availableModes,
  schedule,
  onSaved,
  courseInstructor = null,
  suggestedBatchNumber = 1,
  usedBatchNumbers = [],
}: ScheduleDialogProps) {
  const isEdit = Boolean(schedule);
  const [previewLocale, setPreviewLocale] = useState<'en' | 'ar'>('en');
  const [preview, setPreview] = useState<AdminOccurrenceDto[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [step, setStep] = useState<StepIndex>(0);
  const [maxStep, setMaxStep] = useState<StepIndex>(0);
  const abortRef = useRef<AbortController | null>(null);
  const bodyRef = useRef<HTMLDivElement | null>(null);
  const zones = useMemo(() => allTimezones(), []);
  const cohortTimezone = zones.includes(DEFAULT_COHORT_TIMEZONE)
    ? DEFAULT_COHORT_TIMEZONE
    : (zones[0] ?? 'UTC');
  const safeSuggestedBatch = suggestedBatchNumber >= 1 ? suggestedBatchNumber : 1;

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: defaultScheduleValues(),
    // Validate on blur; after a submit attempt RHF re-validates on change (default).
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  // Fresh defaults every time the dialog opens (or the edited row changes),
  // so a previous upload / toggle never leaks into the next open.
  useEffect(() => {
    if (!open) return;
    if (schedule) {
      form.reset(scheduleToFormValues(schedule));
      setMaxStep(LAST_STEP);
    } else {
      form.reset({
        ...defaultScheduleValues(cohortTimezone),
        type: 'cohort',
        delivery_mode: 'live',
        format: 'online',
        batch_number: safeSuggestedBatch,
        recurrence_type: 'custom_dates',
        repeat_custom_monthly: false,
        ends_type: 'after_count',
        start_time: DEFAULT_COHORT_START,
        end_time: DEFAULT_COHORT_END,
      });
      setMaxStep(0);
    }
    setStep(0);
    setPreview([]);
    setPreviewLoading(false);
  }, [open, schedule?.id, schedule, form, safeSuggestedBatch, cohortTimezone]);

  // Narrow watches only — a form-wide useWatch() re-rendered this entire dialog
  // (calendar, sessions table, preview) on every keystroke in title/notes/prices.
  const scheduleType = useWatch({ control: form.control, name: 'type' }) || 'separate';
  const recurrenceType =
    useWatch({ control: form.control, name: 'recurrence_type' }) || 'once';
  const timezoneValue =
    useWatch({ control: form.control, name: 'timezone' }) || cohortTimezone;
  const formatValue: DeliveryFormat =
    useWatch({ control: form.control, name: 'format' }) || 'online';
  const useCourseInstructor =
    useWatch({ control: form.control, name: 'use_course_instructor' }) !== false;
  const batchNumberValue =
    useWatch({ control: form.control, name: 'batch_number' }) ?? null;
  const price = useWatch({ control: form.control, name: 'price' });
  const original = useWatch({ control: form.control, name: 'original_price' });
  const trainerNameEn = useWatch({ control: form.control, name: 'trainer_name_en' });
  const trainerNameAr = useWatch({ control: form.control, name: 'trainer_name_ar' });
  const trainerTitleEn = useWatch({ control: form.control, name: 'trainer_title_en' });
  const trainerTitleAr = useWatch({ control: form.control, name: 'trainer_title_ar' });
  const trainerPhoto = useWatch({ control: form.control, name: 'trainer_photo' });

  const isCohort = scheduleType === 'cohort';
  const batchNumberInUse =
    batchNumberValue != null &&
    usedBatchNumbers.includes(batchNumberValue) &&
    (!isEdit || schedule?.batch_number !== batchNumberValue);

  const discount =
    original != null && price != null && original > price && original > 0
      ? Math.round((1 - price / original) * 100)
      : null;

  // Live preview via subscription — does NOT re-render the dialog on each keystroke.
  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    let timer: number | undefined;

    const runPreview = (values: ScheduleFormValues) => {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        const parsed = scheduleFormSchema.safeParse(values);
        // Incomplete rule: keep the last good preview, do not clear / refetch.
        if (!parsed.success) return;

        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;
        setPreviewLoading(true);

        try {
          const rows = await previewAdminSchedule(
            courseId,
            { ...toSchedulePayload(parsed.data), limit: 12 },
            controller.signal
          );
          if (!cancelled && !controller.signal.aborted) {
            setPreview(rows);
          }
        } catch (error) {
          if (
            cancelled ||
            controller.signal.aborted ||
            (error as { name?: string })?.name === 'CanceledError' ||
            (error as { code?: string })?.code === 'ERR_CANCELED'
          ) {
            return;
          }
          // Keep the previous list on network errors — do not flash empty.
        } finally {
          if (!cancelled && !controller.signal.aborted) {
            setPreviewLoading(false);
          }
        }
      }, 400);
    };

    runPreview(form.getValues());
    const subscription = form.watch((values) => {
      runPreview(values as ScheduleFormValues);
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      abortRef.current?.abort();
      subscription.unsubscribe();
    };
  }, [open, courseId, form]);

  // Scroll the inner body back to the top on every step change.
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [step]);

  // Overlay form trainer onto preview rows so Step 3 Review matches the Batch step
  // (API preview may lag unsaved Instructor-tab edits or in-form custom trainer).
  const previewWithInstructor = useMemo(() => {
    if (useCourseInstructor) {
      if (!courseInstructor) return preview;
      return preview.map((row) => ({
        ...row,
        trainer: {
          name_en: courseInstructor.instructor_name || row.trainer.name_en,
          name_ar: courseInstructor.instructor_name_ar || row.trainer.name_ar,
          title_en: courseInstructor.instructor_title_en || row.trainer.title_en,
          title_ar: courseInstructor.instructor_title_ar || row.trainer.title_ar,
          photo: courseInstructor.instructor_photo || row.trainer.photo,
        },
      }));
    }

    return preview.map((row) => ({
      ...row,
      trainer: {
        name_en: trainerNameEn || row.trainer.name_en,
        name_ar: trainerNameAr || row.trainer.name_ar,
        title_en: trainerTitleEn || row.trainer.title_en,
        title_ar: trainerTitleAr || row.trainer.title_ar,
        photo: trainerPhoto || row.trainer.photo,
      },
    }));
  }, [
    preview,
    useCourseInstructor,
    courseInstructor,
    trainerNameEn,
    trainerNameAr,
    trainerTitleEn,
    trainerTitleAr,
    trainerPhoto,
  ]);

  // Errors flattened from RHF + the local batch-number clash.
  const errorsTree = form.formState.errors;
  const allErrors = useMemo<FormErrorItem[]>(() => {
    const items = collectErrors(errorsTree);
    if (isCohort && batchNumberInUse && !items.some((i) => i.path === 'batch_number')) {
      items.unshift({
        path: 'batch_number',
        message: `Batch ${batchNumberValue} is already used by another batch of this course.`,
      });
    }
    return items;
  }, [errorsTree, isCohort, batchNumberInUse, batchNumberValue]);

  const stepErrors = useMemo(
    () => (isCohort ? allErrors.filter((item) => stepForPath(item.path) === step) : allErrors),
    [allErrors, isCohort, step]
  );
  const stepHasErrors = (index: StepIndex) =>
    allErrors.some((item) => stepForPath(item.path) === index);

  const focusField = useCallback(
    (path: string) => {
      const target = stepForPath(path);
      const run = () => {
        try {
          form.setFocus(path as FormPath);
        } catch {
          /* field not registered (e.g. whole-array error) — nothing to focus */
        }
      };
      if (isCohort && target !== step) {
        setStep(target);
        window.requestAnimationFrame(() => window.requestAnimationFrame(run));
      } else {
        run();
      }
    },
    [form, isCohort, step]
  );

  // Snapshot when entering Review — avoid subscribing the whole dialog to every field.
  const reviewValues = isCohort && step === LAST_STEP ? form.getValues() : null;
  const reviewWarnings = useMemo(
    () => (reviewValues ? computeCohortWarnings(reviewValues) : []),
    // Refresh when step/preview changes (e.g. returning to Review after edits).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [step, isCohort, preview]
  );

  const applyServerErrors = (error: unknown): string | null => {
    const data = (error as { data?: { errors?: Record<string, string[] | string> } })?.data;
    const fieldErrors = data?.errors;
    if (!fieldErrors || typeof fieldErrors !== 'object') return null;

    let firstMessage: string | null = null;
    let firstField: string | null = null;
    Object.entries(fieldErrors).forEach(([key, messages]) => {
      const message = Array.isArray(messages) ? messages[0] : messages;
      if (!message) return;
      // custom_dates.0 → custom_dates so RHF can show the section error.
      const field = key.includes('.') ? key.slice(0, key.indexOf('.')) : key;
      form.setError(field as keyof ScheduleFormValues, { type: 'server', message: String(message) });
      if (!firstMessage) {
        firstMessage = String(message);
        firstField = field;
      }
    });
    if (firstField && isCohort) setStep(stepForPath(firstField));
    return firstMessage;
  };

  const requestClose = () => {
    if (form.formState.isDirty) {
      const ok = window.confirm('Discard unsaved changes to this schedule?');
      if (!ok) return;
    }
    onOpenChange(false);
  };

  const submit = form.handleSubmit(
    async (values) => {
      if (values.type === 'cohort' && batchNumberInUse) {
        setStep(0);
        toast.error(`Batch ${values.batch_number} is already used by another batch.`);
        window.requestAnimationFrame(() => form.setFocus('batch_number'));
        return;
      }
      try {
        const payload = toSchedulePayload(values);
        if (isEdit && schedule) {
          await updateAdminSchedule(courseId, schedule.id, payload);
          toast.success('Schedule updated.');
        } else {
          await createAdminSchedule(courseId, payload);
          toast.success('Schedule created.');
        }
        form.reset(values);
        onSaved();
        onOpenChange(false);
      } catch (error) {
        const firstFieldError = applyServerErrors(error);
        toast.error(
          firstFieldError ||
            (error instanceof ApiError ? error.message : 'Could not save the schedule.')
        );
      }
    },
    (errors) => {
      const items = collectErrors(errors);
      const first = items[0];
      if (!first) return;
      toast.error('Please fix the highlighted fields.');
      focusField(first.path);
    }
  );

  const goToStep = (target: StepIndex) => {
    setStep(target);
    setMaxStep((prev) => (target > prev ? target : prev));
  };

  const goNext = async () => {
    if (step >= LAST_STEP) return;
    const fields = step === 0 ? BATCH_STEP_FIELDS : SESSION_STEP_FIELDS;
    const valid = await form.trigger(fields);
    if (step === 0 && batchNumberInUse) {
      window.requestAnimationFrame(() => form.setFocus('batch_number'));
      return;
    }
    if (!valid) {
      const first = collectErrors(form.formState.errors).find(
        (item) => stepForPath(item.path) === step
      );
      if (first) focusField(first.path);
      return;
    }
    goToStep((step + 1) as StepIndex);
  };

  const goBack = () => {
    if (step > 0) setStep((step - 1) as StepIndex);
  };

  const onStepClick = (target: StepIndex) => {
    if (target === step) return;
    if (target < step || target <= maxStep) {
      setStep(target);
      return;
    }
    void goNext();
  };

  const handleFormSubmit = (event: FormEvent<HTMLFormElement>) => {
    // Enter inside a field must advance the stepper, not save a half-filled batch.
    if (isCohort && step < LAST_STEP) {
      event.preventDefault();
      void goNext();
      return;
    }
    void submit(event);
  };

  const changeType = (next: ScheduleFormValues['type']) => {
    if (next === scheduleType) return;
    const opts = { shouldDirty: true } as const;
    const current = form.getValues();
    form.clearErrors();
    form.setValue('type', next, opts);

    if (next === 'cohort') {
      const wasCustom = current.recurrence_type === 'custom_dates';
      form.setValue('recurrence_type', 'custom_dates', opts);
      form.setValue('repeat_custom_monthly', false, opts);
      form.setValue('ends_type', 'after_count', opts);
      form.setValue('duration_days', 1, opts);
      if (current.batch_number == null) {
        form.setValue('batch_number', safeSuggestedBatch, opts);
      }
      if (!isEdit && current.start_time === '09:00' && current.end_time === '17:00') {
        form.setValue('start_time', DEFAULT_COHORT_START, opts);
        form.setValue('end_time', DEFAULT_COHORT_END, opts);
      }
      const startTime =
        !isEdit && current.start_time === '09:00' && current.end_time === '17:00'
          ? DEFAULT_COHORT_START
          : current.start_time;
      const endTime =
        !isEdit && current.start_time === '09:00' && current.end_time === '17:00'
          ? DEFAULT_COHORT_END
          : current.end_time;
      if (wasCustom && current.custom_dates.length > 0 && current.sessions.length === 0) {
        const synced = syncSessionsFromDates(current.custom_dates, [], {
          start_time: startTime,
          end_time: endTime,
        });
        form.setValue('sessions', synced, opts);
        form.setValue(
          'custom_dates',
          synced.map((s) => s.date),
          opts
        );
      } else {
        form.setValue('custom_dates', [], opts);
        form.setValue('sessions', [], opts);
      }
      setStep(0);
      setMaxStep(isEdit ? LAST_STEP : 0);
    } else {
      form.setValue('sessions', [], opts);
      form.setValue('phases', [], opts);
      form.setValue('enrollment_closes_at', null, opts);
      setStep(0);
      setMaxStep(0);
    }
  };

  const changeDelivery = (next: DeliveryFormat) => {
    const opts = { shouldDirty: true, shouldValidate: true } as const;
    form.setValue('format', next, opts);
    form.setValue('delivery_mode', next === 'online' ? 'live' : null, opts);
  };

  const batchLabel = batchNumberValue != null ? ` Batch ${batchNumberValue}` : ' Batch';
  const saveLabel = isCohort
    ? `${isEdit ? 'Save' : 'Create'}${batchLabel}`
    : isEdit
      ? 'Save schedule'
      : 'Create schedule';

  const titleText = isCohort
    ? isEdit
      ? `Edit${batchNumberValue != null ? ` Batch ${batchNumberValue}` : ' batch'}`
      : 'Add batch'
    : isEdit
      ? 'Edit schedule'
      : 'Add schedule';

  const typeToggle = (
    <FormField
      control={form.control}
      name="type"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Schedule type</FormLabel>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ['separate', 'Separate', 'Each generated date is its own batch (Batch 1, 2, 3…)'],
                ['cohort', 'One batch', 'All dates become sessions of a single batch number'],
              ] as const
            ).map(([value, title, hint]) => (
              <button
                key={value}
                type="button"
                aria-pressed={field.value === value}
                onClick={() => changeType(value)}
                className={cn(
                  'min-h-[72px] cursor-pointer rounded-2xl border px-4 py-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum-400/50',
                  field.value === value
                    ? 'border-plum-500 bg-plum-50 dark:border-plum-400 dark:bg-plum-500/15'
                    : 'border-gray-200 hover:border-plum-300 dark:border-white/10 dark:hover:border-plum-400/40'
                )}
              >
                <div className="text-sm font-semibold text-gray-900 dark:text-white">{title}</div>
                <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{hint}</div>
              </button>
            ))}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  const showPlatform = formatValue === 'online' || formatValue === 'hybrid';
  const showVenue = formatValue === 'in_person' || formatValue === 'hybrid';
  const locationLabelEn =
    formatValue === 'online'
      ? 'Platform (EN)'
      : formatValue === 'in_person'
        ? 'Venue (EN)'
        : 'Platform / Venue (EN)';
  const locationLabelAr =
    formatValue === 'online'
      ? 'Platform (AR)'
      : formatValue === 'in_person'
        ? 'Venue (AR)'
        : 'Platform / Venue (AR)';
  const locationPlaceholder = showPlatform && !showVenue ? 'e.g. Zoom' : showVenue && !showPlatform ? 'e.g. Riyadh office' : 'e.g. Zoom + Riyadh office';

  /* ---------------------------------------------------------------- */
  /* Cohort · step 1                                                    */
  /* ---------------------------------------------------------------- */
  const cohortBatchStep = (
    <div className="space-y-8">
      <ErrorSummary items={stepErrors} onPick={focusField} />

      <section className="space-y-4">
        <SectionTitle>Batch</SectionTitle>
        {typeToggle}

        <FormField
          control={form.control}
          name="batch_number"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel>
                Batch number <span className="text-red-600">*</span>
              </FormLabel>
              <FormControl>
                <ScheduleNumberInput
                  field={field}
                  min={1}
                  step="1"
                  nullable
                  placeholder="e.g. 21"
                />
              </FormControl>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Fixed batch number shown to students (e.g. Batch 21).
              </p>
              {batchNumberInUse ? (
                <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-300">
                  Batch {batchNumberValue} is already used by another batch of this course. Pick a
                  different number.
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField form={form} name="title_en" label="Label (EN)" placeholder="Optional" />
          <TextField form={form} name="title_ar" label="Label (AR)" rtl placeholder="اختياري" />
        </div>

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 dark:border-white/10">
              <FormLabel className="font-normal">Active (visible publicly)</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </section>

      <section className="space-y-4">
        <SectionTitle>Delivery</SectionTitle>
        <FormField
          control={form.control}
          name="format"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivery</FormLabel>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    ['online', 'Live online'],
                    ['in_person', 'In-person'],
                    ['hybrid', 'Hybrid'],
                  ] as const
                ).map(([value, label]) => (
                  <ChoiceButton
                    key={value}
                    active={field.value === value}
                    onClick={() => changeDelivery(value)}
                  >
                    {label}
                  </ChoiceButton>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            form={form}
            name="location_en"
            label={locationLabelEn}
            placeholder={locationPlaceholder}
            help={
              formatValue === 'hybrid'
                ? 'One field for both the online platform and the physical venue.'
                : undefined
            }
          />
          <TextField
            form={form}
            name="location_ar"
            label={locationLabelAr}
            rtl
            placeholder={locationPlaceholder}
          />
        </div>
      </section>

      <section className="space-y-4">
        <SectionTitle>Time</SectionTitle>
        <TimezoneField form={form} zones={zones} timezone={timezoneValue} />
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400">
          Default time for new sessions. Each session can override it in the next step.
        </p>
      </section>

      <section className="space-y-4">
        <SectionTitle>Price & seats</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price ({currency})</FormLabel>
                <FormControl>
                  <ScheduleNumberInput field={field} min={0} step="0.01" nullable />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="original_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Original price</FormLabel>
                <FormControl>
                  <ScheduleNumberInput field={field} min={0} step="0.01" nullable />
                </FormControl>
                {discount != null ? (
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {discount}% OFF
                  </p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="seats_total"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seats total</FormLabel>
                <FormControl>
                  <ScheduleNumberInput field={field} min={1} placeholder="Unlimited" nullable />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="enrollment_closes_at"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel>Enrollment closes on</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value || null)}
                  onBlur={field.onBlur}
                  name={field.name}
                  ref={field.ref}
                />
              </FormControl>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Defaults to the date of session 2 when you pick dates.
              </p>
              <FormMessage />
            </FormItem>
          )}
        />
      </section>

      <TrainerSection
        form={form}
        courseInstructor={courseInstructor}
        locale={previewLocale}
        useCourseInstructor={useCourseInstructor}
      />

      <section className="space-y-4">
        <SectionTitle>Notes</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField
            form={form}
            name="notes_en"
            label="Batch note (EN)"
            textarea
            placeholder="e.g. Extra 2 weeks of support if needed"
          />
          <TextField
            form={form}
            name="notes_ar"
            label="Batch note (AR)"
            textarea
            rtl
            placeholder="يمكن توفير دعم إضافي لمدة أسبوعين عند الحاجة"
          />
        </div>
      </section>

      <details className="rounded-2xl border border-gray-200 px-4 py-3 dark:border-white/10">
        <summary className="min-h-8 cursor-pointer text-sm font-semibold text-gray-700 dark:text-gray-200">
          More options (promo, call to action, display)
        </summary>
        <div className="mt-4 space-y-4">
          <ExtraOptions form={form} includeEnrollmentHours={false} />
        </div>
      </details>
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Cohort · step 2 / 3                                                */
  /* ---------------------------------------------------------------- */
  const cohortSessionsStep = (
    <div className="space-y-6">
      <ErrorSummary items={stepErrors} onPick={focusField} />
      <SessionsEditor form={form} />
    </div>
  );

  const cohortReviewStep = (
    <div className="space-y-6">
      <ErrorSummary items={allErrors} onPick={focusField} />
      {reviewValues ? (
        <CohortReviewPanel
          values={reviewValues}
          preview={previewWithInstructor}
          locale={previewLocale}
          onLocaleChange={setPreviewLocale}
          warnings={reviewWarnings}
        />
      ) : null}
    </div>
  );

  /* ---------------------------------------------------------------- */
  /* Separate · single scroll                                           */
  /* ---------------------------------------------------------------- */
  const separateForm = (
    <div className="space-y-8">
      <ErrorSummary items={stepErrors} onPick={focusField} />

      <section className="space-y-4">
        <SectionTitle>Basics</SectionTitle>
        {typeToggle}

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField form={form} name="title_en" label="Title (EN)" />
          <TextField form={form} name="title_ar" label="Title (AR)" rtl />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="delivery_mode"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Delivery mode</FormLabel>
                <Select
                  value={field.value ?? 'all'}
                  onValueChange={(v) => field.onChange(v === 'all' ? null : v)}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="all">All modes</SelectItem>
                    {availableModes.map((mode) => (
                      <SelectItem key={mode} value={mode}>
                        {mode}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="format"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Format</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ['online', 'Online'],
                      ['in_person', 'In-person'],
                      ['hybrid', 'Hybrid'],
                    ] as const
                  ).map(([value, label]) => (
                    <ChoiceButton
                      key={value}
                      active={field.value === value}
                      onClick={() => field.onChange(value)}
                    >
                      {label}
                    </ChoiceButton>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="batch_number"
          render={({ field }) => (
            <FormItem className="max-w-xs">
              <FormLabel>
                {recurrenceType === 'once' ? 'Batch number' : 'Starting batch number'}
              </FormLabel>
              <FormControl>
                <ScheduleNumberInput
                  field={field}
                  min={1}
                  step="1"
                  nullable
                  placeholder="Optional"
                />
              </FormControl>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {recurrenceType === 'once'
                  ? 'Leave empty to hide the batch chip on public cards.'
                  : 'Each generated date gets this number + its position in the series (including past dates).'}
              </p>
              {batchNumberInUse ? (
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  Batch {batchNumberValue} is already used by another batch of this course. You can
                  still save.
                </p>
              ) : null}
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-3 sm:grid-cols-2">
          <TextField form={form} name="location_en" label="Location (EN)" />
          <TextField form={form} name="location_ar" label="Location (AR)" rtl />
        </div>

        <FormField
          control={form.control}
          name="is_active"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 dark:border-white/10">
              <FormLabel className="font-normal">Active (visible publicly)</FormLabel>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              </FormControl>
            </FormItem>
          )}
        />
      </section>

      <section className="space-y-4">
        <SectionTitle>Date & time</SectionTitle>
        <TimezoneField form={form} zones={zones} timezone={timezoneValue} />
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End time</FormLabel>
                <FormControl>
                  <Input type="time" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="duration_days"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Batch length (days)</FormLabel>
                <FormControl>
                  <ScheduleNumberInput field={field} min={1} max={365} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="time_slot"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time slot</FormLabel>
              <div className="flex flex-wrap gap-2">
                {(
                  [
                    [null, 'Auto'],
                    ['morning', 'Morning'],
                    ['afternoon', 'Afternoon'],
                    ['evening', 'Evening'],
                  ] as const
                ).map(([value, label]) => (
                  <ChoiceButton
                    key={label}
                    active={(field.value ?? null) === value}
                    onClick={() => field.onChange(value)}
                  >
                    {label}
                  </ChoiceButton>
                ))}
              </div>
              <FormMessage />
            </FormItem>
          )}
        />
      </section>

      <section className="space-y-4">
        <SectionTitle>Repeat</SectionTitle>
        {/* Calendar, ends / max_occurrences and their FormMessages live in RecurrenceEditor. */}
        <RecurrenceEditor form={form} />
      </section>

      <section className="space-y-4">
        <SectionTitle>Price & seats</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-3">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Price ({currency})</FormLabel>
                <FormControl>
                  <ScheduleNumberInput field={field} min={0} step="0.01" nullable />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="original_price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Original price</FormLabel>
                <FormControl>
                  <ScheduleNumberInput field={field} min={0} step="0.01" nullable />
                </FormControl>
                {discount != null ? (
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                    {discount}% OFF
                  </p>
                ) : null}
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="seats_total"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seats total</FormLabel>
                <FormControl>
                  <ScheduleNumberInput field={field} min={1} placeholder="Unlimited" nullable />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <ExtraOptions form={form} includeEnrollmentHours />
      </section>

      <TrainerSection
        form={form}
        courseInstructor={courseInstructor}
        locale={previewLocale}
        useCourseInstructor={useCourseInstructor}
      />

      <section className="space-y-4">
        <SectionTitle>Notes</SectionTitle>
        <div className="grid gap-3 sm:grid-cols-2">
          <TextField form={form} name="notes_en" label="Notes (EN)" textarea rows={3} />
          <TextField form={form} name="notes_ar" label="Notes (AR)" textarea rows={3} rtl />
        </div>
      </section>
    </div>
  );

  const cohortBody =
    step === 0 ? cohortBatchStep : step === 1 ? cohortSessionsStep : cohortReviewStep;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="flex max-h-[95vh] w-full max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="sticky top-0 z-10 shrink-0 space-y-3 border-b border-gray-200 bg-white px-6 py-4 pe-12 dark:border-white/10 dark:bg-[#181124]">
          <div className="space-y-1">
            <DialogTitle>{titleText}</DialogTitle>
            <DialogDescription>
              Changes here are saved immediately when you click Save — they are not part of the
              course form submit.
            </DialogDescription>
          </div>

          {isCohort ? (
            <ol className="flex items-center gap-2" aria-label="Batch steps">
              {STEPS.map((item, index) => {
                const idx = index as StepIndex;
                const current = idx === step;
                const done = idx < step || (idx <= maxStep && idx !== step && !stepHasErrors(idx));
                const invalid = stepHasErrors(idx) && idx !== step;
                return (
                  <li key={item.id} className="flex flex-1 items-center gap-2 last:flex-none">
                    <button
                      type="button"
                      onClick={() => onStepClick(idx)}
                      aria-current={current ? 'step' : undefined}
                      className={cn(
                        'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum-400/50',
                        current
                          ? 'border-plum-500 bg-plum-600 text-white'
                          : invalid
                            ? 'border-red-300 bg-red-50 text-red-800 dark:border-red-400/40 dark:bg-red-500/10 dark:text-red-100'
                            : 'border-gray-200 text-gray-700 hover:border-plum-300 dark:border-white/10 dark:text-gray-200'
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs',
                          current
                            ? 'bg-white/20'
                            : invalid
                              ? 'bg-red-100 dark:bg-red-500/20'
                              : 'bg-gray-100 dark:bg-white/10'
                        )}
                      >
                        {invalid ? (
                          <AlertCircle className="h-3.5 w-3.5" />
                        ) : done && !current ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          index + 1
                        )}
                      </span>
                      {item.label}
                    </button>
                    {index < STEPS.length - 1 ? (
                      <span
                        aria-hidden
                        className="h-px flex-1 bg-gray-200 dark:bg-white/10"
                      />
                    ) : null}
                  </li>
                );
              })}
            </ol>
          ) : null}
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={handleFormSubmit}
            noValidate
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {isCohort ? (
                <div className="px-6 py-5">{cohortBody}</div>
              ) : (
                <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="px-6 py-5">{separateForm}</div>
                  <aside className="min-h-[28rem] border-t border-gray-200 bg-gray-50 px-5 py-5 dark:border-white/10 dark:bg-white/5 lg:border-s lg:border-t-0">
                    <div className="lg:sticky lg:top-5">
                      <SchedulePreview
                        occurrences={previewWithInstructor}
                        loading={previewLoading}
                        locale={previewLocale}
                        onLocaleChange={setPreviewLocale}
                        scheduleTimezone={timezoneValue || 'Asia/Kuala_Lumpur'}
                        className="min-h-[24rem]"
                      />
                    </div>
                  </aside>
                </div>
              )}
            </div>

            <DialogFooter className="sticky bottom-0 z-10 shrink-0 gap-2 border-t border-gray-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-[#181124] sm:justify-between">
              <Button type="button" variant="secondary" onClick={requestClose}>
                Cancel
              </Button>

              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                {isCohort && step > 0 ? (
                  <Button key="back" type="button" variant="outline" onClick={goBack}>
                    <ChevronLeft className="me-1 h-4 w-4 rtl:rotate-180" aria-hidden />
                    Back
                  </Button>
                ) : null}

                {isCohort && step < LAST_STEP ? (
                  <Button key="next" type="button" onClick={() => void goNext()}>
                    Next
                    <ChevronRight className="ms-1 h-4 w-4 rtl:rotate-180" aria-hidden />
                  </Button>
                ) : (
                  <Button
                    key="save"
                    type="submit"
                    disabled={form.formState.isSubmitting || (isCohort && batchNumberInUse)}
                  >
                    {form.formState.isSubmitting ? (
                      <Loader2 className="me-1 h-4 w-4 animate-spin" aria-hidden />
                    ) : null}
                    {saveLabel}
                  </Button>
                )}
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
