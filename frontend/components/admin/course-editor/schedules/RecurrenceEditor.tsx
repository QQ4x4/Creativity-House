'use client';

import { useEffect, useMemo, useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import { format, parseISO, startOfMonth } from 'date-fns';
import { AlertTriangle, X } from 'lucide-react';

import { Calendar } from '@/components/ui/calendar';
import { Checkbox } from '@/components/ui/checkbox';
import {
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
import type { ScheduleFormValues } from '@/lib/admin/scheduleSchema';
import { syncSessionsFromDates } from '@/lib/admin/scheduleSchema';
import { todayInTimeZone } from '@/lib/catalog/scheduleTime';
import { cn } from '@/lib/utils';

import { ScheduleNumberInput } from './ScheduleNumberInput';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

const RECURRENCE_OPTIONS: {
  value: ScheduleFormValues['recurrence_type'];
  title: string;
  hint: string;
}[] = [
  { value: 'once', title: 'One time', hint: 'A single batch on one start date' },
  { value: 'custom_dates', title: 'Specific dates', hint: 'Pick exact dates on a calendar' },
  { value: 'weekly', title: 'Days of the week', hint: 'Repeat on selected weekdays' },
  { value: 'monthly_days', title: 'Days of the month', hint: 'Repeat on day numbers' },
];

interface RecurrenceEditorProps {
  form: UseFormReturn<ScheduleFormValues>;
}

export function RecurrenceEditor({ form }: RecurrenceEditorProps) {
  // Named watches only — never form.watch() the whole values tree.
  const scheduleType = form.watch('type') || 'separate';
  const isCohort = scheduleType === 'cohort';
  const recurrenceType = form.watch('recurrence_type');
  const customDates = form.watch('custom_dates') ?? [];
  const weekdays = form.watch('weekdays') ?? [];
  const monthDays = form.watch('month_days') ?? [];
  const endsType = form.watch('ends_type');
  const timezone = form.watch('timezone') || 'Asia/Kuala_Lumpur';
  const startsOn = form.watch('starts_on');

  // "Today" and mins are calendar dates in the selected schedule timezone.
  const todayYmd = useMemo(() => todayInTimeZone(timezone), [timezone]);
  const endsOnMin = useMemo(() => {
    if (startsOn && startsOn > todayYmd) return startsOn;
    return todayYmd;
  }, [startsOn, todayYmd]);

  const selectedCustom = useMemo(
    () =>
      customDates
        .map((d) => {
          try {
            return parseISO(d);
          } catch {
            return null;
          }
        })
        .filter((d): d is Date => d instanceof Date && !Number.isNaN(d.getTime())),
    [customDates]
  );

  const pastSelectedCount = useMemo(
    () => customDates.filter((d) => d < todayYmd).length,
    [customDates, todayYmd]
  );

  const initialMonth = useMemo(() => {
    const first = customDates[0] || startsOn || todayYmd;
    try {
      return startOfMonth(parseISO(first));
    } catch {
      return startOfMonth(new Date());
    }
  }, [customDates, startsOn, todayYmd]);

  const [month, setMonth] = useState<Date>(initialMonth);

  useEffect(() => {
    setMonth(initialMonth);
  }, [initialMonth]);

  const applyCustomDates = (nextDates: string[]) => {
    const next = [...new Set(nextDates)].sort();
    form.setValue('custom_dates', next, { shouldDirty: true, shouldValidate: true });
    if (next[0]) {
      form.setValue('starts_on', next[0], { shouldDirty: true });
    }
    if (isCohort) {
      const sessions = form.getValues('sessions') ?? [];
      form.setValue(
        'sessions',
        syncSessionsFromDates(next, sessions, {
          start_time: form.getValues('start_time') || '09:00',
          end_time: form.getValues('end_time') || '17:00',
        }),
        { shouldDirty: true, shouldValidate: true }
      );
      if (next.length >= 2) {
        const closes = form.getValues('enrollment_closes_at');
        if (!closes) {
          form.setValue('enrollment_closes_at', next[1], { shouldDirty: true });
        }
      }
    }
  };

  // For weekly / monthly cohort: after ends change, regenerate dates via preview is hard —
  // admin typically uses Specific dates for cohort. Still allow weekly: sync starts_on only.
  useEffect(() => {
    if (!isCohort || recurrenceType !== 'custom_dates') return;
    const sessions = form.getValues('sessions') ?? [];
    const currentDates = sessions.map((s) => s.date).sort().join('|');
    const wanted = [...customDates].sort().join('|');
    if (currentDates === wanted) return;
    form.setValue(
      'sessions',
      syncSessionsFromDates(customDates, sessions, {
        start_time: form.getValues('start_time') || '09:00',
        end_time: form.getValues('end_time') || '17:00',
      }),
      { shouldDirty: true, shouldValidate: true }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional sync on date list only
  }, [isCohort, recurrenceType, customDates.join('|')]);

  const dropdownStart = useMemo(() => new Date(2000, 0, 1), []);
  const dropdownEnd = useMemo(() => new Date(2045, 11, 31), []);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2">
        {RECURRENCE_OPTIONS.map((option) => {
          const selected = recurrenceType === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                form.setValue('recurrence_type', option.value, { shouldDirty: true });
                if (option.value === 'once') {
                  form.setValue('ends_type', 'never', { shouldDirty: true });
                }
                if (isCohort && option.value === 'custom_dates') {
                  // Keep sessions; switching into custom dates is the primary cohort path.
                }
              }}
              className={cn(
                'min-h-[72px] cursor-pointer rounded-2xl border px-4 py-3 text-start transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum-400/50',
                selected
                  ? 'border-plum-500 bg-plum-50 dark:border-plum-400 dark:bg-plum-500/15'
                  : 'border-gray-200 hover:border-plum-300 dark:border-white/10 dark:hover:border-plum-400/40'
              )}
            >
              <div className="text-sm font-semibold text-gray-900 dark:text-white">
                {option.title}
              </div>
              <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{option.hint}</div>
            </button>
          );
        })}
      </div>

      {recurrenceType === 'once' || recurrenceType === 'weekly' || recurrenceType === 'monthly_days' ? (
        <FormField
          control={form.control}
          name="starts_on"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{recurrenceType === 'once' ? 'Date' : 'Starts on'}</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={field.value ?? ''}
                  min={isCohort ? undefined : todayYmd}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      ) : null}

      {recurrenceType === 'custom_dates' ? (
        <div className="space-y-3">
          <Label>Selected dates</Label>
          <div className="rounded-2xl border border-gray-200 p-2 dark:border-white/10">
            <Calendar
              mode="multiple"
              numberOfMonths={2}
              month={month}
              onMonthChange={setMonth}
              captionLayout="dropdown"
              startMonth={dropdownStart}
              endMonth={dropdownEnd}
              className="[&_.rdp-months]:flex-col sm:[&_.rdp-months]:flex-row"
              selected={selectedCustom}
              onSelect={(dates) => {
                const next = (dates ?? [])
                  .map((d) => format(d, 'yyyy-MM-dd'))
                  .sort();
                applyCustomDates(next);
              }}
            />
          </div>
          {pastSelectedCount > 0 ? (
            <p className="inline-flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {pastSelectedCount} selected date{pastSelectedCount === 1 ? ' is' : 's are'} in the
              past (schedule timezone). Allowed when editing a running batch.
            </p>
          ) : null}
          {customDates.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {customDates.map((date) => (
                <span
                  key={date}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
                    date < todayYmd
                      ? 'bg-amber-50 text-amber-900 dark:bg-amber-500/20 dark:text-amber-100'
                      : 'bg-plum-50 text-plum-800 dark:bg-plum-500/20 dark:text-plum-100'
                  )}
                >
                  {date}
                  <button
                    type="button"
                    aria-label={`Remove ${date}`}
                    className="cursor-pointer rounded-full p-0.5 hover:bg-black/5 dark:hover:bg-white/10"
                    onClick={() => applyCustomDates(customDates.filter((d) => d !== date))}
                  >
                    <X className="h-3 w-3" aria-hidden />
                  </button>
                </span>
              ))}
            </div>
          ) : null}
          {form.formState.errors.custom_dates ? (
            <p className="text-sm text-red-600 dark:text-red-300">
              {String(form.formState.errors.custom_dates.message ?? 'Select at least one date.')}
            </p>
          ) : null}
          {!isCohort ? (
            <FormField
              control={form.control}
              name="repeat_custom_monthly"
              render={({ field }) => (
                <FormItem className="flex items-center gap-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={(v) => field.onChange(Boolean(v))}
                    />
                  </FormControl>
                  <FormLabel className="font-normal">
                    Repeat every month on the same day numbers
                  </FormLabel>
                </FormItem>
              )}
            />
          ) : null}
        </div>
      ) : null}

      {recurrenceType === 'weekly' ? (
        <div className="space-y-3">
          <Label>Weekdays</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, index) => {
              const on = weekdays.includes(index);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = on
                      ? weekdays.filter((d) => d !== index)
                      : [...weekdays, index].sort((a, b) => a - b);
                    form.setValue('weekdays', next, { shouldDirty: true, shouldValidate: true });
                  }}
                  className={cn(
                    'min-h-11 min-w-11 cursor-pointer rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum-400/50',
                    on
                      ? 'border-plum-500 bg-plum-600 text-white'
                      : 'border-gray-200 text-gray-700 dark:border-white/10 dark:text-gray-200'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          {form.formState.errors.weekdays ? (
            <p className="text-sm text-red-600 dark:text-red-300">
              {String(form.formState.errors.weekdays.message ?? 'Select at least one weekday.')}
            </p>
          ) : null}
          <FormField
            control={form.control}
            name="repeat_interval"
            render={({ field }) => (
              <FormItem className="max-w-xs">
                <FormLabel>Repeat every N week(s)</FormLabel>
                <FormControl>
                  <ScheduleNumberInput field={field} min={1} max={12} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      ) : null}

      {recurrenceType === 'monthly_days' ? (
        <div className="space-y-3">
          <Label>Days of the month</Label>
          <div className="grid grid-cols-7 gap-2 sm:grid-cols-8">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const on = monthDays.includes(day);
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={on}
                  onClick={() => {
                    const next = on
                      ? monthDays.filter((d) => d !== day)
                      : [...monthDays, day].sort((a, b) => a - b);
                    form.setValue('month_days', next, { shouldDirty: true, shouldValidate: true });
                  }}
                  className={cn(
                    'min-h-11 cursor-pointer rounded-xl border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum-400/50',
                    on
                      ? 'border-plum-500 bg-plum-600 text-white'
                      : 'border-gray-200 text-gray-700 dark:border-white/10 dark:text-gray-200'
                  )}
                >
                  {day}
                </button>
              );
            })}
          </div>
          {form.formState.errors.month_days ? (
            <p className="text-sm text-red-600 dark:text-red-300">
              {String(form.formState.errors.month_days.message ?? 'Select at least one day.')}
            </p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="repeat_interval"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Repeat every N month(s)</FormLabel>
                  <FormControl>
                    <ScheduleNumberInput field={field} min={1} max={12} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="missing_day_policy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>If a day doesn’t exist</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="skip">Skip that month</SelectItem>
                      <SelectItem value="last_day">Use the last day</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>
      ) : null}

      {recurrenceType !== 'once' && !isCohort ? (
        <div className="space-y-3 rounded-2xl border border-gray-200 p-4 dark:border-white/10">
          <Label>Ends</Label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['never', 'Never'],
                ['on_date', 'On a date'],
                ['after_count', 'After N batches'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={endsType === value}
                onClick={() => form.setValue('ends_type', value, { shouldDirty: true })}
                className={cn(
                  'min-h-11 cursor-pointer rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum-400/50',
                  endsType === value
                    ? 'border-plum-500 bg-plum-600 text-white'
                    : 'border-gray-200 dark:border-white/10'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {endsType === 'on_date' ? (
            <FormField
              control={form.control}
              name="ends_on"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>End date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value ?? ''}
                      min={endsOnMin}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          {endsType === 'after_count' ? (
            <FormField
              control={form.control}
              name="max_occurrences"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Number of batches</FormLabel>
                  <FormControl>
                    <ScheduleNumberInput field={field} min={1} max={200} nullable />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
        </div>
      ) : null}

      {isCohort && recurrenceType !== 'once' && recurrenceType !== 'custom_dates' ? (
        <div className="space-y-3 rounded-2xl border border-gray-200 p-4 dark:border-white/10">
          <Label>Ends (generates session dates)</Label>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['on_date', 'On a date'],
                ['after_count', 'After N sessions'],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={endsType === value}
                onClick={() => form.setValue('ends_type', value, { shouldDirty: true })}
                className={cn(
                  'min-h-11 cursor-pointer rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum-400/50',
                  endsType === value
                    ? 'border-plum-500 bg-plum-600 text-white'
                    : 'border-gray-200 dark:border-white/10'
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {endsType === 'on_date' ? (
            <FormField
              control={form.control}
              name="ends_on"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>End date</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value || null)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          {endsType === 'after_count' ? (
            <FormField
              control={form.control}
              name="max_occurrences"
              render={({ field }) => (
                <FormItem className="max-w-xs">
                  <FormLabel>Number of sessions</FormLabel>
                  <FormControl>
                    <ScheduleNumberInput field={field} min={1} max={200} nullable />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : null}
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Tip: after setting weekdays/month days and ends, switch briefly to Specific dates or
            use the live preview — then pick Exact dates on the calendar for full session editing.
            Prefer Specific dates for multi-session batches.
          </p>
        </div>
      ) : null}
    </div>
  );
}
