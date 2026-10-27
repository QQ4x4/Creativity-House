'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
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

import { RecurrenceEditor } from './RecurrenceEditor';
import { ScheduleNumberInput } from './ScheduleNumberInput';
import { SchedulePreview } from './SchedulePreview';

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
  const [photoFailed, setPhotoFailed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const zones = useMemo(() => allTimezones(), []);

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleFormSchema),
    defaultValues: defaultScheduleValues(),
    mode: 'onBlur',
  });

  // Fresh defaults every time the dialog opens (or the edited row changes),
  // so a previous upload / toggle never leaks into the next open.
  useEffect(() => {
    if (!open) return;
    if (schedule) {
      form.reset(scheduleToFormValues(schedule));
    } else {
      form.reset({
        ...defaultScheduleValues(),
        batch_number: suggestedBatchNumber >= 1 ? suggestedBatchNumber : 1,
      });
    }
    setPreview([]);
    setPreviewLoading(false);
    setPhotoFailed(false);
  }, [open, schedule?.id, schedule, form, suggestedBatchNumber]);

  // Stable key — form.watch() returns a new object every render and was
  // retriggering this effect whenever setPreviewLoading flipped (flicker loop).
  const watchedValues = useWatch({ control: form.control });
  const previewKey = useMemo(() => JSON.stringify(watchedValues ?? {}), [watchedValues]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      let values: ScheduleFormValues;
      try {
        values = JSON.parse(previewKey) as ScheduleFormValues;
      } catch {
        return;
      }

      const parsed = scheduleFormSchema.safeParse(values);
      // Incomplete rule: keep the last good preview, do not clear / refetch.
      if (!parsed.success) {
        return;
      }

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

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [previewKey, open, courseId]);

  const applyServerErrors = (error: unknown): string | null => {
    const data = (error as { data?: { errors?: Record<string, string[] | string> } })?.data;
    const fieldErrors = data?.errors;
    if (!fieldErrors || typeof fieldErrors !== 'object') return null;

    let firstMessage: string | null = null;
    Object.entries(fieldErrors).forEach(([key, messages]) => {
      const message = Array.isArray(messages) ? messages[0] : messages;
      if (!message) return;
      // custom_dates.0 → custom_dates so RHF can show the section error.
      const field = key.includes('.') ? key.slice(0, key.indexOf('.')) : key;
      form.setError(field as keyof ScheduleFormValues, { type: 'server', message: String(message) });
      if (!firstMessage) firstMessage = String(message);
    });
    return firstMessage;
  };

  const requestClose = () => {
    if (form.formState.isDirty) {
      const ok = window.confirm('Discard unsaved changes to this schedule?');
      if (!ok) return;
    }
    onOpenChange(false);
  };

  const onSubmit = form.handleSubmit(async (values) => {
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
          (error instanceof ApiError
            ? error.message
            : 'Could not save the schedule.')
      );
    }
  });

  const price = watchedValues?.price;
  const original = watchedValues?.original_price;
  const discount =
    original != null && price != null && original > price && original > 0
      ? Math.round((1 - price / original) * 100)
      : null;
  const useCourseInstructor = watchedValues?.use_course_instructor !== false;
  const recurrenceType = watchedValues?.recurrence_type || 'once';
  const batchNumberValue = watchedValues?.batch_number ?? null;
  const batchNumberInUse =
    batchNumberValue != null &&
    usedBatchNumbers.includes(batchNumberValue) &&
    (!isEdit || schedule?.batch_number !== batchNumberValue);

  const courseInstructorName =
    previewLocale === 'ar'
      ? courseInstructor?.instructor_name_ar || courseInstructor?.instructor_name || null
      : courseInstructor?.instructor_name || courseInstructor?.instructor_name_ar || null;
  const courseInstructorTitle =
    previewLocale === 'ar'
      ? courseInstructor?.instructor_title_ar || courseInstructor?.instructor_title_en || null
      : courseInstructor?.instructor_title_en || courseInstructor?.instructor_title_ar || null;
  const courseInstructorPhoto = courseInstructor?.instructor_photo || null;
  const courseInstructorInitials = (courseInstructorName || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';
  const showCourseInstructorPhoto = Boolean(courseInstructorPhoto) && !photoFailed;

  // Overlay form instructor onto preview rows when using course instructor
  // (API preview reads the saved course, which may lag unsaved Instructor-tab edits).
  const previewWithInstructor = useMemo(() => {
    if (!useCourseInstructor || !courseInstructor) return preview;
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
  }, [preview, useCourseInstructor, courseInstructor]);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) requestClose();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="flex max-h-[95vh] w-full max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl">
        <DialogHeader className="border-b border-gray-200 px-6 py-4 dark:border-white/10">
          <DialogTitle>{isEdit ? 'Edit schedule' : 'Add schedule'}</DialogTitle>
          <DialogDescription>
            Changes here are saved immediately when you click Save — they are not part of the
            course form submit.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={onSubmit}
            noValidate
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
          >
            <div className="grid min-h-0 flex-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="space-y-8 px-6 py-5">
                {/* Basics */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                    Basics
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="title_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title (EN)</FormLabel>
                          <FormControl>
                            <Input
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="title_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Title (AR)</FormLabel>
                          <FormControl>
                            <Input
                              dir="rtl"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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
                              <button
                                key={value}
                                type="button"
                                aria-pressed={field.value === value}
                                onClick={() => field.onChange(value)}
                                className={cn(
                                  'min-h-11 rounded-xl border px-3 text-sm font-semibold',
                                  field.value === value
                                    ? 'border-plum-500 bg-plum-600 text-white'
                                    : 'border-gray-200 dark:border-white/10'
                                )}
                              >
                                {label}
                              </button>
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
                        <p className="text-xs text-muted-foreground">
                          {recurrenceType === 'once'
                            ? 'Leave empty to hide the batch chip on public cards.'
                            : 'Each generated date gets this number + its position in the series (including past dates).'}
                        </p>
                        {batchNumberInUse ? (
                          <p className="text-xs text-amber-700 dark:text-amber-300">
                            Batch {batchNumberValue} is already used by another batch of this
                            course. You can still save.
                          </p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="location_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location (EN)</FormLabel>
                          <FormControl>
                            <Input
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location (AR)</FormLabel>
                          <FormControl>
                            <Input
                              dir="rtl"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
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

                {/* Date & time */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                    Date & time
                  </h3>
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
                        <FormMessage />
                      </FormItem>
                    )}
                  />
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
                            <button
                              key={label}
                              type="button"
                              aria-pressed={(field.value ?? null) === value}
                              onClick={() => field.onChange(value)}
                              className={cn(
                                'min-h-11 rounded-xl border px-3 text-sm font-semibold',
                                (field.value ?? null) === value
                                  ? 'border-plum-500 bg-plum-600 text-white'
                                  : 'border-gray-200 dark:border-white/10'
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>

                {/* Repeat */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                    Repeat
                  </h3>
                  <RecurrenceEditor form={form} />
                </section>

                {/* Price & seats */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                    Price & seats
                  </h3>
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
                            <ScheduleNumberInput
                              field={field}
                              min={1}
                              placeholder="Unlimited"
                              nullable
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="promo_text_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Promo text (EN)</FormLabel>
                          <FormControl>
                            <Input
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="promo_text_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Promo text (AR)</FormLabel>
                          <FormControl>
                            <Input
                              dir="rtl"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="show_seats_left"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 dark:border-white/10">
                          <FormLabel className="font-normal">Show seats left</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
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
                            <button
                              key={value}
                              type="button"
                              aria-pressed={field.value === value}
                              onClick={() => field.onChange(value)}
                              className={cn(
                                'min-h-11 rounded-xl border px-3 text-sm font-semibold',
                                field.value === value
                                  ? 'border-plum-500 bg-plum-600 text-white'
                                  : 'border-gray-200 dark:border-white/10'
                              )}
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </section>

                {/* Trainer */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                    Trainer
                  </h3>
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
                        <FormLabel className="font-normal">Use course instructor</FormLabel>
                      </FormItem>
                    )}
                  />
                  {useCourseInstructor ? (
                    <div className="rounded-2xl border border-gray-200 bg-gray-50/80 p-3 dark:border-white/10 dark:bg-white/5">
                      {courseInstructorName || courseInstructorPhoto ? (
                        <div className="flex items-center gap-3">
                          {showCourseInstructorPhoto ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={courseInstructorPhoto!}
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
                              {courseInstructorInitials}
                            </span>
                          )}
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-gray-900 dark:text-white">
                              {courseInstructorName || 'Course instructor'}
                            </div>
                            {courseInstructorTitle ? (
                              <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                                {courseInstructorTitle}
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No course instructor set yet.
                        </p>
                      )}
                      <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                        Edit in the Instructor tab
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <FormField
                          control={form.control}
                          name="trainer_name_en"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name (EN)</FormLabel>
                              <FormControl>
                                <Input
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value || null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="trainer_name_ar"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Name (AR)</FormLabel>
                              <FormControl>
                                <Input
                                  dir="rtl"
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value || null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="trainer_title_en"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title (EN)</FormLabel>
                              <FormControl>
                                <Input
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value || null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="trainer_title_ar"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Title (AR)</FormLabel>
                              <FormControl>
                                <Input
                                  dir="rtl"
                                  value={field.value ?? ''}
                                  onChange={(e) => field.onChange(e.target.value || null)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
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

                {/* Display */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">
                    Display
                  </h3>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="show_countdown"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 dark:border-white/10">
                          <FormLabel className="font-normal">Show countdown</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="is_featured"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between rounded-xl border border-gray-200 px-3 py-2 dark:border-white/10">
                          <FormLabel className="font-normal">Featured card</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </FormItem>
                      )}
                    />
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
                  <div className="grid gap-3 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="notes_en"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (EN)</FormLabel>
                          <FormControl>
                            <Textarea
                              rows={3}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="notes_ar"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (AR)</FormLabel>
                          <FormControl>
                            <Textarea
                              dir="rtl"
                              rows={3}
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </section>
              </div>

              <aside className="min-h-[28rem] border-t border-gray-200 bg-gray-50 px-5 py-5 dark:border-white/10 dark:bg-white/5 lg:sticky lg:top-0 lg:min-h-full lg:border-s lg:border-t-0 lg:self-stretch">
                <SchedulePreview
                  occurrences={previewWithInstructor}
                  loading={previewLoading}
                  locale={previewLocale}
                  onLocaleChange={setPreviewLocale}
                  scheduleTimezone={watchedValues?.timezone || 'Asia/Kuala_Lumpur'}
                  className="min-h-[24rem]"
                />
              </aside>
            </div>

            <DialogFooter className="sticky bottom-0 border-t border-gray-200 bg-white px-6 py-4 dark:border-white/10 dark:bg-[#181124]">
              <Button type="button" variant="secondary" onClick={requestClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : null}
                {isEdit ? 'Save schedule' : 'Create schedule'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
