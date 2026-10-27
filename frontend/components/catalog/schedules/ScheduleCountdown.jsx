'use client';

import { useMemo } from 'react';
import {
  countdownParts,
  formatCountdownLabel,
} from '@/lib/catalog/schedules';

/**
 * Compact countdown badge. Parent owns the shared `now` tick via useNow.
 */
export default function ScheduleCountdown({
  startAt,
  now,
  lang = 'en',
  labels,
  show = true,
  className = '',
}) {
  const parts = useMemo(() => {
    if (!now || !startAt || !show) return null;
    return countdownParts(startAt, now);
  }, [now, startAt, show]);

  if (!show) return null;

  // Stable placeholder until the shared clock mounts — avoids hydration mismatch.
  if (!now || !parts) {
    return (
      <div
        className={`rounded-xl border border-gray-200 bg-white/90 px-2.5 py-1.5 text-xs shadow-sm dark:border-white/10 dark:bg-[#181124]/90 ${className}`}
        aria-hidden
      >
        <div className="text-[10px] font-semibold uppercase tracking-wide text-gray-500">
          {labels?.startsIn || 'Starts in'}
        </div>
        <div className="font-semibold tabular-nums text-gray-400">—</div>
      </div>
    );
  }

  if (parts.totalMs <= 0) {
    return (
      <div
        className={`rounded-xl border border-gray-200 bg-white/90 px-2.5 py-1.5 text-xs shadow-sm dark:border-white/10 dark:bg-[#181124]/90 ${className}`}
      >
        <div className="font-semibold text-gray-700 dark:text-gray-200">
          {labels?.started || 'Started'}
        </div>
      </div>
    );
  }

  const urgent = parts.totalMs < 24 * 3600 * 1000;
  const label = formatCountdownLabel(parts, lang);
  const full =
    lang === 'ar'
      ? `${labels?.startsIn || 'يبدأ خلال'} ${label}`
      : `${labels?.startsIn || 'Starts in'} ${label}`;

  return (
    <div
      className={`rounded-xl border px-2.5 py-1.5 text-xs shadow-sm ${
        urgent
          ? 'border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-400/40 dark:bg-amber-500/15 dark:text-amber-100'
          : 'border-gray-200 bg-white/90 text-gray-800 dark:border-white/10 dark:bg-[#181124]/90 dark:text-gray-100'
      } ${className}`}
      aria-label={full}
    >
      <div className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
        {labels?.startsIn || 'Starts in'}
      </div>
      <div className="font-semibold tabular-nums">{label}</div>
    </div>
  );
}
