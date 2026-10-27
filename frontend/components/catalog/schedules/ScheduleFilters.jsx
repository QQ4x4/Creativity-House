'use client';

import { useMemo } from 'react';
import {
  currentAndNextMonthKeys,
  effectiveTimeSlot,
  formatInZone,
  isWeekdayBatchInZone,
  isWeekendBatchInZone,
  monthKeyInZone,
} from '@/lib/catalog/scheduleTime';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

function Toggle({ pressed, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={`min-h-11 shrink-0 rounded-xl border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-plum-400/50 ${
        pressed
          ? 'border-plum-500 bg-plum-600 text-white'
          : 'border-gray-200 bg-white text-gray-700 dark:border-white/10 dark:bg-white/5 dark:text-gray-200'
      }`}
    >
      {children}
    </button>
  );
}

const filterSelectTriggerClass =
  'min-h-11 w-auto min-w-[8.5rem] shrink-0 rounded-xl border-gray-200 bg-white px-3 text-sm text-gray-900 shadow-none dark:border-white/10 dark:bg-white/5 dark:text-gray-100';

export default function ScheduleFilters({
  occurrences,
  filters,
  onChange,
  labels,
  lang = 'en',
  timeZone = 'UTC',
}) {
  const formats = useMemo(() => {
    const set = new Set(occurrences.map((o) => o.format).filter(Boolean));
    return [...set];
  }, [occurrences]);

  const months = useMemo(() => {
    const map = new Map();
    occurrences.forEach((o) => {
      const key = monthKeyInZone(o, timeZone);
      if (!key || map.has(key)) return;
      try {
        const label = formatInZone(o.startAt, timeZone, lang, {
          month: 'long',
          year: 'numeric',
        });
        map.set(key, label || key);
      } catch {
        map.set(key, key);
      }
    });
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [occurrences, lang, timeZone]);

  const set = (patch) => onChange({ ...filters, ...patch });
  const clear = () =>
    onChange({
      thisMonth: false,
      nextMonth: false,
      weekend: false,
      weekday: false,
      timeSlot: '',
      format: '',
      month: '',
    });

  const hasActive =
    filters.thisMonth ||
    filters.nextMonth ||
    filters.weekend ||
    filters.weekday ||
    filters.timeSlot ||
    filters.format ||
    filters.month;

  return (
    <div className="space-y-3">
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        <Toggle
          pressed={filters.thisMonth}
          onClick={() => set({ thisMonth: !filters.thisMonth, nextMonth: false, month: '' })}
        >
          {labels.thisMonth || 'This month'}
        </Toggle>
        <Toggle
          pressed={filters.nextMonth}
          onClick={() => set({ nextMonth: !filters.nextMonth, thisMonth: false, month: '' })}
        >
          {labels.nextMonth || 'Next month'}
        </Toggle>
        <Toggle
          pressed={filters.weekend}
          onClick={() => set({ weekend: !filters.weekend, weekday: false })}
        >
          {labels.weekend || 'Weekend'}
        </Toggle>
        <Toggle
          pressed={filters.weekday}
          onClick={() => set({ weekday: !filters.weekday, weekend: false })}
        >
          {labels.weekday || 'Weekday'}
        </Toggle>

        <Select
          value={filters.timeSlot || 'all'}
          onValueChange={(value) => set({ timeSlot: value === 'all' ? '' : value })}
        >
          <SelectTrigger
            aria-label={labels.timeSlot || 'Time slot'}
            className={filterSelectTriggerClass}
          >
            <SelectValue placeholder={labels.timeSlot || 'Time slot'} />
          </SelectTrigger>
          <SelectContent position="popper" className="z-[60]">
            <SelectItem value="all">{labels.timeSlot || 'Time slot'}</SelectItem>
            <SelectItem value="morning">{labels.morning || 'Morning'}</SelectItem>
            <SelectItem value="afternoon">{labels.afternoon || 'Afternoon'}</SelectItem>
            <SelectItem value="evening">{labels.evening || 'Evening'}</SelectItem>
          </SelectContent>
        </Select>

        {formats.length > 1 ? (
          <Select
            value={filters.format || 'all'}
            onValueChange={(value) => set({ format: value === 'all' ? '' : value })}
          >
            <SelectTrigger
              aria-label={labels.format || 'Format'}
              className={filterSelectTriggerClass}
            >
              <SelectValue placeholder={labels.format || 'Format'} />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[60]">
              <SelectItem value="all">{labels.format || 'Format'}</SelectItem>
              {formats.map((f) => (
                <SelectItem key={f} value={f}>
                  {labels.formats?.[f] || f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {months.length > 1 ? (
          <Select
            value={filters.month || 'all'}
            onValueChange={(value) =>
              set({
                month: value === 'all' ? '' : value,
                thisMonth: false,
                nextMonth: false,
              })
            }
          >
            <SelectTrigger
              aria-label={labels.month || 'Month'}
              className={filterSelectTriggerClass}
            >
              <SelectValue placeholder={labels.month || 'Month'} />
            </SelectTrigger>
            <SelectContent position="popper" className="z-[60]">
              <SelectItem value="all">{labels.month || 'Month'}</SelectItem>
              {months.map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : null}

        {hasActive ? (
          <button
            type="button"
            onClick={clear}
            className="min-h-11 shrink-0 rounded-xl px-3 text-sm font-semibold text-plum-700 underline-offset-2 hover:underline dark:text-gold-300"
          >
            {labels.clearFilters || 'Clear filters'}
          </button>
        ) : null}
      </div>
    </div>
  );
}

/** Filter using the visitor's browser timezone. */
export function applyScheduleFilters(occurrences, filters, timeZone = 'UTC') {
  const { thisMonth, nextMonth } = currentAndNextMonthKeys(timeZone);

  return occurrences.filter((o) => {
    const monthKey = monthKeyInZone(o, timeZone);
    if (filters.thisMonth && monthKey !== thisMonth) return false;
    if (filters.nextMonth && monthKey !== nextMonth) return false;
    if (filters.month && monthKey !== filters.month) return false;
    if (filters.weekend && !isWeekendBatchInZone(o, timeZone)) return false;
    if (filters.weekday && !isWeekdayBatchInZone(o, timeZone)) return false;
    if (filters.timeSlot && effectiveTimeSlot(o, timeZone) !== filters.timeSlot) return false;
    if (filters.format && o.format !== filters.format) return false;
    return true;
  });
}
