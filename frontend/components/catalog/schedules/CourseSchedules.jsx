'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useNow } from '@/hooks/useNow';
import { useVisitorTimeZone } from '@/hooks/useVisitorTimeZone';
import { formatResultsCount } from '@/lib/catalog/schedules';
import ScheduleCard from './ScheduleCard';
import ScheduleFilters, { applyScheduleFilters } from './ScheduleFilters';

const PAGE_SIZE = 4;

/**
 * Public "Explore our schedules" block inside the Training schedule section.
 */
export default function CourseSchedules({
  schedules,
  course,
  mode,
  lang,
  labels,
  isEnrolled = false,
  onSwitchMode,
}) {
  const [filters, setFilters] = useState({
    thisMonth: false,
    nextMonth: false,
    weekend: false,
    weekday: false,
    timeSlot: '',
    format: '',
    month: '',
  });
  const [visible, setVisible] = useState(PAGE_SIZE);
  const { mounted, timeZone } = useVisitorTimeZone();

  const forMode = useMemo(
    () =>
      (schedules || []).filter(
        (o) =>
          o.deliveryMode == null ||
          o.deliveryMode === '' ||
          o.deliveryMode === mode
      ),
    [schedules, mode]
  );

  const otherModes = useMemo(() => {
    if (forMode.length > 0 || !schedules?.length) return [];
    const set = new Set();
    schedules.forEach((o) => {
      if (o.deliveryMode) set.add(o.deliveryMode);
    });
    return [...set];
  }, [schedules, forMode.length]);

  const filtered = useMemo(
    () =>
      applyScheduleFilters(forMode, filters, timeZone).sort((a, b) =>
        a.startAt.localeCompare(b.startAt)
      ),
    [forMode, filters, timeZone]
  );

  const urgent = useMemo(
    () =>
      filtered.some((o) => {
        if (!o.showCountdown || !o.startAt) return false;
        const ms = new Date(o.startAt).getTime() - Date.now();
        return ms > 0 && ms < 24 * 3600 * 1000;
      }),
    [filtered]
  );

  const now = useNow({ urgent });

  if (!schedules?.length) {
    return (
      <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
        <Link
          href={`/${lang}/course-inquiry?course=${encodeURIComponent(course.slug)}`}
          className="font-semibold text-plum-700 underline-offset-2 hover:underline dark:text-gold-300"
        >
          {labels.requestPrivate || 'Request a private or corporate batch'}
        </Link>
      </p>
    );
  }

  return (
    <div id="schedules" className="mt-6 scroll-mt-28 space-y-4">
      <div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
          {labels.explore || 'Explore our schedules'}
        </h3>
      </div>

      {forMode.length === 0 && otherModes.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100">
          <p>
            {(labels.availableForMode || 'Schedules are available for {mode}').replace(
              '{mode}',
              labels.modes?.[otherModes[0]] || otherModes[0]
            )}
          </p>
          {typeof onSwitchMode === 'function' ? (
            <button
              type="button"
              className="mt-2 min-h-11 rounded-xl bg-plum-600 px-3 text-sm font-semibold text-white"
              onClick={() => onSwitchMode(otherModes[0])}
            >
              {(labels.switchToMode || 'Switch to {mode}').replace(
                '{mode}',
                labels.modes?.[otherModes[0]] || otherModes[0]
              )}
            </button>
          ) : null}
        </div>
      ) : (
        <>
          <ScheduleFilters
            occurrences={forMode}
            filters={filters}
            onChange={(next) => {
              setFilters(next);
              setVisible(PAGE_SIZE);
            }}
            labels={labels}
            lang={lang}
            timeZone={timeZone}
          />

          <p className="text-sm text-gray-500 dark:text-gray-400">
            {formatResultsCount(filtered.length, lang, labels)}
          </p>

          <div className="space-y-3">
            {filtered.slice(0, visible).map((occurrence) => (
              <ScheduleCard
                key={`${occurrence.scheduleId}-${occurrence.occurrenceDate}`}
                occurrence={occurrence}
                course={course}
                lang={lang}
                mode={mode}
                labels={labels}
                now={now}
                isEnrolled={isEnrolled}
                timeMounted={mounted}
                visitorTimeZone={timeZone}
              />
            ))}
          </div>

          {visible < filtered.length ? (
            <button
              type="button"
              onClick={() => setVisible((n) => n + PAGE_SIZE)}
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-300 px-4 text-sm font-semibold text-gray-700 dark:border-white/15 dark:text-gray-200"
            >
              {labels.showMore || 'Show more'}
            </button>
          ) : null}
        </>
      )}
    </div>
  );
}
