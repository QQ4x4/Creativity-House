'use client';

import { formatOccurrenceWhenDisplay } from '@/lib/catalog/scheduleTime';
import { useVisitorTimeZone } from '@/hooks/useVisitorTimeZone';
import { cn } from '@/lib/utils';

/**
 * Hydration-safe date + time block.
 * SSR / pre-mount: schedule's own zone. After mount: visitor zone (+ schedule secondary).
 */
export default function OccurrenceWhen({
  occurrence,
  lang = 'en',
  labels = {},
  /** Optional external mount/zone (share one hook with filters). */
  mounted: mountedProp,
  timeZone: timeZoneProp,
  dateClassName = 'break-words text-base font-bold text-gray-900 dark:text-white sm:text-lg',
  timeClassName = 'break-words text-sm text-gray-600 dark:text-gray-300',
  secondaryClassName = 'break-words text-xs text-gray-500 dark:text-gray-400',
  as: DateTag = 'h3',
  className = '',
}) {
  const local = useVisitorTimeZone();
  const mounted = mountedProp ?? local.mounted;
  const timeZone = timeZoneProp ?? local.timeZone;

  const display = formatOccurrenceWhenDisplay(occurrence, {
    visitorZone: timeZone,
    mounted,
    lang,
    labels,
  });

  return (
    <div className={cn('min-h-[2.75rem] min-w-0 space-y-0.5', className)}>
      <DateTag className={dateClassName}>{display.dateLine}</DateTag>
      {display.timeLine ? <p className={timeClassName}>{display.timeLine}</p> : null}
      {display.secondary ? (
        <p className={secondaryClassName}>{display.secondary}</p>
      ) : null}
    </div>
  );
}
