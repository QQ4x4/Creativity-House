'use client';

import { memo, useMemo, useState } from 'react';
import { useFieldArray, useFormState, useWatch } from 'react-hook-form';
import type { UseFormReturn } from 'react-hook-form';
import { format, parseISO, startOfMonth } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';

import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
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
import {
  generateWeeklySessionDates,
  summarizeCohortSessions,
  syncSessionsFromDates,
  type ScheduleFormValues,
  type SchedulePhaseFormValue,
} from '@/lib/admin/scheduleSchema';
import { cn } from '@/lib/utils';

const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;

interface SessionsEditorProps {
  form: UseFormReturn<ScheduleFormValues>;
}

function weekdayName(ymd: string): string {
  try {
    return format(parseISO(ymd), 'EEE');
  } catch {
    return '—';
  }
}

interface SessionRowProps {
  form: UseFormReturn<ScheduleFormValues>;
  index: number;
  date: string;
  phases: SchedulePhaseFormValue[];
  selected: boolean;
  onSelect: (checked: boolean) => void;
  onRemove: () => void;
  onDateChange: (nextDate: string) => void;
}

const SessionRow = memo(function SessionRow({
  form,
  index,
  date,
  phases,
  selected,
  onSelect,
  onRemove,
  onDateChange,
}: SessionRowProps) {
  return (
    <tr
      className={cn(
        'border-t border-gray-100 dark:border-white/10',
        index % 2 === 1 && 'bg-gray-50/60 dark:bg-white/[0.02]'
      )}
    >
      <td className="px-2 py-2">
        <Checkbox
          checked={selected}
          onCheckedChange={(v) => onSelect(Boolean(v))}
          aria-label={`Select session ${index + 1}`}
        />
      </td>
      <td className="px-3 py-2 font-semibold">{index + 1}</td>
      <td className="px-3 py-2 whitespace-nowrap">
        <Input
          type="date"
          className="min-h-11 w-[10.5rem]"
          value={date}
          onChange={(e) => onDateChange(e.target.value)}
        />
      </td>
      <td className="px-3 py-2 text-gray-600 dark:text-gray-300">{weekdayName(date)}</td>
      <td className="px-3 py-2">
        <FormField
          control={form.control}
          name={`sessions.${index}.start_time`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input type="time" className="min-h-11 w-[7.5rem]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </td>
      <td className="px-3 py-2">
        <FormField
          control={form.control}
          name={`sessions.${index}.end_time`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input type="time" className="min-h-11 w-[7.5rem]" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </td>
      <td className="min-w-[10rem] px-3 py-2">
        <FormField
          control={form.control}
          name={`sessions.${index}.title_en`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
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
      </td>
      <td className="min-w-[10rem] px-3 py-2">
        <FormField
          control={form.control}
          name={`sessions.${index}.title_ar`}
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <Input
                  dir="rtl"
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
      </td>
      <td className="min-w-[9rem] px-3 py-2">
        <FormField
          control={form.control}
          name={`sessions.${index}.phase_index`}
          render={({ field }) => (
            <FormItem>
              <Select
                value={field.value == null ? 'none' : String(field.value)}
                onValueChange={(v) => field.onChange(v === 'none' ? null : Number(v))}
              >
                <FormControl>
                  <SelectTrigger className="min-h-11">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {phases.map((phase, phaseIndex) => (
                    <SelectItem key={phaseIndex} value={String(phaseIndex)}>
                      {phase.name_en || phase.name_ar || `Phase ${phaseIndex + 1}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </td>
      <td className="px-3 py-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="min-h-11 min-w-11 cursor-pointer"
          aria-label={`Remove session ${index + 1}`}
          onClick={onRemove}
        >
          <Trash2 className="h-4 w-4" aria-hidden />
        </Button>
      </td>
    </tr>
  );
});

export function SessionsEditor({ form }: SessionsEditorProps) {
  // Structural watches only — title keystrokes must not re-render the calendar/table shell.
  const phases = useWatch({ control: form.control, name: 'phases' }) ?? [];
  const startTime = useWatch({ control: form.control, name: 'start_time' }) || '19:30';
  const endTime = useWatch({ control: form.control, name: 'end_time' }) || '22:00';
  const startsOn = useWatch({ control: form.control, name: 'starts_on' });
  const timezone = useWatch({ control: form.control, name: 'timezone' }) || 'Asia/Riyadh';
  const customDates = useWatch({ control: form.control, name: 'custom_dates' }) ?? [];

  const { fields, replace } = useFieldArray({
    control: form.control,
    name: 'sessions',
  });

  const { errors } = useFormState({
    control: form.control,
    name: 'sessions',
  });
  const sessionErrors = errors.sessions;

  const [addMode, setAddMode] = useState<'weekly' | 'calendar'>('weekly');
  const [weekdays, setWeekdays] = useState<number[]>([3]); // Wed
  const [sessionCount, setSessionCount] = useState(11);
  const [firstDate, setFirstDate] = useState(startsOn || '');
  const [skipDates, setSkipDates] = useState<string[]>([]);
  const [skipInput, setSkipInput] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  const [movePhase, setMovePhase] = useState<string>('none');

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

  const [month, setMonth] = useState(() => {
    const seed = customDates[0] || startsOn || new Date().toISOString().slice(0, 10);
    try {
      return startOfMonth(parseISO(seed));
    } catch {
      return startOfMonth(new Date());
    }
  });

  const applyDates = (dates: string[]) => {
    const current = form.getValues('sessions') ?? [];
    const next = syncSessionsFromDates(dates, current, {
      start_time: form.getValues('start_time') || '19:30',
      end_time: form.getValues('end_time') || '22:00',
    });
    replace(next);
    form.setValue('custom_dates', next.map((s) => s.date), {
      shouldDirty: true,
      shouldValidate: true,
    });
    if (next[0]) {
      form.setValue('starts_on', next[0].date, { shouldDirty: true });
      form.setValue('start_time', next[0].start_time, { shouldDirty: true });
      form.setValue('end_time', next[0].end_time, { shouldDirty: true });
    }
    if (next.length >= 2) {
      const closes = form.getValues('enrollment_closes_at');
      if (!closes) {
        form.setValue('enrollment_closes_at', next[1].date, { shouldDirty: true });
      }
    }
  };

  const generateWeekly = () => {
    const base = firstDate || startsOn;
    if (!base || weekdays.length === 0) return;
    const dates = generateWeeklySessionDates({
      firstDate: base,
      weekdays,
      count: sessionCount,
      skipDates,
    });
    applyDates(dates);
  };

  const summary = useMemo(() => {
    const sessions = form.getValues('sessions') ?? [];
    return summarizeCohortSessions(sessions, phases);
    // fields / customDates / times drive structural summary; titles are ignored by helper.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, phases, startTime, endTime, customDates, form]);

  const sessionErrorMessage =
    sessionErrors?.message || sessionErrors?.root?.message
      ? String(sessionErrors.message || sessionErrors.root?.message || 'Add at least one session.')
      : null;

  return (
    <div className="space-y-5">
      <p className="rounded-xl border border-plum-200/80 bg-plum-50 px-3 py-2 text-sm font-medium text-plum-900 dark:border-plum-400/30 dark:bg-plum-500/10 dark:text-plum-100">
        {summary}
      </p>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ['weekly', 'Weekly'],
            ['calendar', 'Pick on calendar'],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={addMode === value}
            onClick={() => setAddMode(value)}
            className={cn(
              'min-h-11 cursor-pointer rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum-400/50',
              addMode === value
                ? 'border-plum-500 bg-plum-600 text-white'
                : 'border-gray-200 dark:border-white/10'
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {addMode === 'weekly' ? (
        <div className="space-y-3 rounded-2xl border border-gray-200 p-4 dark:border-white/10">
          <Label>Weekdays</Label>
          <div className="flex flex-wrap gap-2">
            {WEEKDAY_LABELS.map((label, index) => {
              const on = weekdays.includes(index);
              return (
                <button
                  key={label}
                  type="button"
                  aria-pressed={on}
                  onClick={() =>
                    setWeekdays((prev) =>
                      on
                        ? prev.filter((d) => d !== index)
                        : [...prev, index].sort((a, b) => a - b)
                    )
                  }
                  className={cn(
                    'min-h-11 min-w-11 cursor-pointer rounded-xl border px-3 text-sm font-semibold',
                    on
                      ? 'border-plum-500 bg-plum-600 text-white'
                      : 'border-gray-200 dark:border-white/10'
                  )}
                >
                  {label}
                </button>
              );
            })}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <Label htmlFor="first-session-date">First date</Label>
              <Input
                id="first-session-date"
                type="date"
                className="mt-1.5 min-h-11"
                value={firstDate}
                onChange={(e) => setFirstDate(e.target.value)}
              />
            </div>
            <div>
              <Label>Number of sessions</Label>
              <div className="mt-1.5">
                <Input
                  type="number"
                  min={1}
                  max={120}
                  className="min-h-11"
                  value={sessionCount}
                  onChange={(e) => setSessionCount(Math.max(1, Number(e.target.value) || 1))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Start</Label>
                <Input
                  type="time"
                  className="mt-1.5 min-h-11"
                  value={startTime}
                  onChange={(e) =>
                    form.setValue('start_time', e.target.value, { shouldDirty: true })
                  }
                />
              </div>
              <div>
                <Label>End</Label>
                <Input
                  type="time"
                  className="mt-1.5 min-h-11"
                  value={endTime}
                  onChange={(e) =>
                    form.setValue('end_time', e.target.value, { shouldDirty: true })
                  }
                />
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Skip dates (gaps)</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                type="date"
                className="min-h-11 max-w-[11rem]"
                value={skipInput}
                onChange={(e) => setSkipInput(e.target.value)}
              />
              <Button
                type="button"
                variant="outline"
                className="min-h-11 cursor-pointer"
                onClick={() => {
                  if (!skipInput || skipDates.includes(skipInput)) return;
                  setSkipDates((prev) => [...prev, skipInput].sort());
                  setSkipInput('');
                }}
              >
                Add skip
              </Button>
            </div>
            {skipDates.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {skipDates.map((d) => (
                  <button
                    key={d}
                    type="button"
                    className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-full bg-amber-50 px-2.5 text-xs font-medium text-amber-900 dark:bg-amber-500/20 dark:text-amber-100"
                    onClick={() => setSkipDates((prev) => prev.filter((x) => x !== d))}
                  >
                    {d} ×
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <Button type="button" className="min-h-11 cursor-pointer" onClick={generateWeekly}>
            Generate sessions
          </Button>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Timezone: {timezone}. Skipped dates are omitted and the series continues after.
          </p>
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl border border-gray-200 p-3 dark:border-white/10">
          <Calendar
            mode="multiple"
            numberOfMonths={2}
            month={month}
            onMonthChange={setMonth}
            captionLayout="dropdown"
            startMonth={new Date(2000, 0, 1)}
            endMonth={new Date(2045, 11, 31)}
            className="[&_.rdp-months]:flex-col sm:[&_.rdp-months]:flex-row"
            selected={selectedCustom}
            onSelect={(dates) => {
              const next = (dates ?? []).map((d) => format(d, 'yyyy-MM-dd')).sort();
              applyDates(next);
            }}
          />
        </div>
      )}

      {/* Phases */}
      <div className="space-y-3 rounded-2xl border border-gray-200 p-3 dark:border-white/10">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <FormLabel className="mb-0">Phases</FormLabel>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11 cursor-pointer"
            onClick={() =>
              form.setValue('phases', [...phases, { name_en: null, name_ar: null }], {
                shouldDirty: true,
              })
            }
          >
            <Plus className="me-1 h-4 w-4" aria-hidden />
            Add phase
          </Button>
        </div>
        {phases.map((_, index) => (
          <div key={index} className="grid gap-2 sm:grid-cols-2">
            <FormField
              control={form.control}
              name={`phases.${index}.name_en`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phase {index + 1} (EN)</FormLabel>
                  <FormControl>
                    <Input
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
            <FormField
              control={form.control}
              name={`phases.${index}.name_ar`}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phase {index + 1} (AR)</FormLabel>
                  <FormControl>
                    <Input
                      dir="rtl"
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
          </div>
        ))}
      </div>

      {fields.length > 0 ? (
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[12rem] flex-1">
            <Label>Move selected to phase</Label>
            <Select value={movePhase} onValueChange={setMovePhase}>
              <SelectTrigger className="mt-1.5 min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No phase</SelectItem>
                {phases.map((phase, i) => (
                  <SelectItem key={i} value={String(i)}>
                    {phase.name_en || phase.name_ar || `Phase ${i + 1}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 cursor-pointer"
            disabled={selectedRows.size === 0}
            onClick={() => {
              const nextIndex = movePhase === 'none' ? null : Number(movePhase);
              const sessions = form.getValues('sessions') ?? [];
              replace(
                sessions.map((session, index) =>
                  selectedRows.has(index)
                    ? { ...session, phase_index: nextIndex }
                    : session
                )
              );
              setSelectedRows(new Set());
            }}
          >
            Move {selectedRows.size} to phase
          </Button>
        </div>
      ) : null}

      {/* Sessions table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-start text-xs uppercase tracking-wide text-gray-500 dark:bg-white/5 dark:text-gray-400">
            <tr>
              <th className="px-2 py-2">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-3 py-2 font-semibold">#</th>
              <th className="px-3 py-2 font-semibold">Date</th>
              <th className="px-3 py-2 font-semibold">Day</th>
              <th className="px-3 py-2 font-semibold">Start</th>
              <th className="px-3 py-2 font-semibold">End</th>
              <th className="px-3 py-2 font-semibold">Title EN</th>
              <th className="px-3 py-2 font-semibold">Title AR</th>
              <th className="px-3 py-2 font-semibold">Phase</th>
              <th className="px-3 py-2 font-semibold">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {fields.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-3 py-6 text-center text-gray-500">
                  Generate weekly dates or pick them on the calendar.
                </td>
              </tr>
            ) : (
              fields.map((field, index) => (
                <SessionRow
                  key={field.id}
                  form={form}
                  index={index}
                  date={field.date}
                  phases={phases}
                  selected={selectedRows.has(index)}
                  onSelect={(checked) => {
                    setSelectedRows((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(index);
                      else next.delete(index);
                      return next;
                    });
                  }}
                  onRemove={() => {
                    const sessions = (form.getValues('sessions') ?? []).filter(
                      (_, i) => i !== index
                    );
                    applyDates(sessions.map((s) => s.date));
                    replace(sessions);
                  }}
                  onDateChange={(nextDate) => {
                    const sessions = [...(form.getValues('sessions') ?? [])];
                    sessions[index] = { ...sessions[index], date: nextDate };
                    sessions.sort((a, b) => a.date.localeCompare(b.date));
                    replace(sessions);
                    form.setValue(
                      'custom_dates',
                      sessions.map((s) => s.date),
                      { shouldDirty: true }
                    );
                  }}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      <Button
        type="button"
        variant="outline"
        className="min-h-11 cursor-pointer"
        onClick={() => {
          const sessions = form.getValues('sessions') ?? [];
          const last = sessions[sessions.length - 1];
          let nextDate = startsOn || format(new Date(), 'yyyy-MM-dd');
          if (last) {
            const d = parseISO(last.date);
            d.setDate(d.getDate() + 7);
            nextDate = format(d, 'yyyy-MM-dd');
          }
          const nextSessions = [
            ...sessions,
            {
              date: nextDate,
              start_time: startTime,
              end_time: endTime,
              title_en: null,
              title_ar: null,
              phase_index: null,
            },
          ].sort((a, b) => a.date.localeCompare(b.date));
          replace(nextSessions);
          form.setValue(
            'custom_dates',
            nextSessions.map((s) => s.date),
            { shouldDirty: true }
          );
        }}
      >
        <Plus className="me-1 h-4 w-4" aria-hidden />
        Add session
      </Button>

      {sessionErrorMessage ? (
        <p className="text-sm text-red-600 dark:text-red-300">{sessionErrorMessage}</p>
      ) : null}
    </div>
  );
}
