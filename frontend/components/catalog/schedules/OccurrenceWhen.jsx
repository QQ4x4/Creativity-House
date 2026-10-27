'use client';

import {
  formatOccurrenceDateRange,
  formatOccurrenceTimeParts,
} from '@/lib/catalog/scheduleTime';
import { useVisitorTimeZone } from '@/hooks/useVisitorTimeZone';
import { cn } from '@/lib/utils';

/**
 * Hydration-safe date + time block in the visitor's browser timezone.
 * Line 1: date range. Line 2: time range · GMT offset (nowrap parts).
 */
export default function OccurrenceWhen({
  occurrence,
  lang = 'en',
  /** Optional external mount/zone (share one hook with filters). */
  mounted: mountedProp,
  timeZone: timeZoneProp,
  dateClassName = 'text-base font-bold text-gray-900 dark:text-white sm:text-lg',
  timeClassName = 'text-sm text-gray-600 dark:text-gray-300',
  as: DateTag = 'h3',
  className = '',
}) {
  const local = useVisitorTimeZone();
  const mounted = mountedProp ?? local.mounted;
  const timeZone = timeZoneProp ?? local.timeZone;

  if (!mounted) {
    return (
      <div className={cn('space-y-1.5', className)} aria-hidden>
        <div className="h-5 max-w-[16rem] animate-pulse rounded bg-gray-200/80 dark:bg-white/10" />
        <div className="h-4 max-w-[12rem] animate-pulse rounded bg-gray-100/80 dark:bg-white/5" />
      </div>
    );
  }

  const dateLine = formatOccurrenceDateRange(occurrence, timeZone, lang);
  const { start, end, offset } = formatOccurrenceTimeParts(occurrence, timeZone, lang);

  return (
    <div className={cn('min-w-0 space-y-0.5', className)}>
      <DateTag className={dateClassName}>{dateLine}</DateTag>
      <p className={timeClassName}>
        <span className="whitespace-nowrap">{start}</span>
        <span aria-hidden> – </span>
        <span className="whitespace-nowrap">{end}</span>
        {offset ? (
          <>
            <span aria-hidden> · </span>
            <span className="whitespace-nowrap">{offset}</span>
          </>
        ) : null}
      </p>
    </div>
  );
}
