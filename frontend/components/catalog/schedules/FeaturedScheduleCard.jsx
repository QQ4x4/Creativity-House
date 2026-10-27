'use client';

import { useState } from 'react';
import OccurrenceWhen from './OccurrenceWhen';
import ScheduleCountdown from './ScheduleCountdown';

function TrainerMini({ trainer }) {
  const [photoFailed, setPhotoFailed] = useState(false);
  if (!trainer?.name) return null;

  const initials = trainer.name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
  const showPhoto = Boolean(trainer.photo) && !photoFailed;

  return (
    <div className="mt-2 flex min-w-0 items-center gap-2">
      {showPhoto ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trainer.photo}
          alt=""
          width={24}
          height={24}
          className="h-6 w-6 rounded-full object-cover"
          onError={() => setPhotoFailed(true)}
        />
      ) : (
        <span
          aria-hidden
          className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-plum-100 text-[10px] font-bold text-plum-800 dark:bg-plum-500/20 dark:text-plum-100"
        >
          {initials}
        </span>
      )}
      <div className="min-w-0">
        <div className="truncate text-[11px] font-medium text-gray-800 dark:text-gray-100">
          {trainer.name}
        </div>
        {trainer.title ? (
          <div className="truncate text-[10px] text-gray-500 dark:text-gray-400">{trainer.title}</div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Compact "next / featured batch" block under the sticky price card.
 */
export default function FeaturedScheduleCard({
  occurrence,
  lang,
  labels,
  now,
}) {
  if (!occurrence) return null;

  return (
    <div className="mt-4 rounded-2xl border border-plum-200/80 bg-plum-50/70 p-3 dark:border-plum-400/25 dark:bg-plum-500/10">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-plum-700 dark:text-gold-300">
            {occurrence.batchNumber != null
              ? (labels.batchNumber || 'Batch {n}').replace('{n}', String(occurrence.batchNumber))
              : labels.nextBatch || 'Next batch'}
          </p>
          <div className="mt-1">
            <OccurrenceWhen
              occurrence={occurrence}
              lang={lang}
              dateClassName="text-sm font-bold text-gray-900 dark:text-white"
              timeClassName="text-[11px] text-gray-600 dark:text-gray-300"
              as="p"
            />
          </div>
          <TrainerMini trainer={occurrence.trainer} />
        </div>
        {occurrence.showCountdown ? (
          <ScheduleCountdown
            startAt={occurrence.startAt}
            now={now}
            lang={lang}
            labels={labels}
          />
        ) : null}
      </div>
      <a
        href="#schedules"
        onClick={(e) => {
          const prefersReduced =
            typeof window !== 'undefined' &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          const el = document.getElementById('schedules');
          if (el) {
            e.preventDefault();
            el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
          }
        }}
        className="mt-2 inline-flex min-h-10 text-xs font-semibold text-plum-700 underline-offset-2 hover:underline dark:text-gold-300"
      >
        {labels.viewAllSchedules || 'View all schedules'}
      </a>
    </div>
  );
}

export function MobileNextBatchLine({ occurrence, lang, labels }) {
  if (!occurrence) return null;

  return (
    <div className="min-w-0">
      <p className="truncate text-[11px] font-semibold text-gray-500 dark:text-gray-400">
        {occurrence.batchNumber != null
          ? (labels?.batchNumber || 'Batch {n}').replace('{n}', String(occurrence.batchNumber))
          : labels?.nextBatch || 'Next batch'}
      </p>
      <OccurrenceWhen
        occurrence={occurrence}
        lang={lang}
        dateClassName="truncate text-[11px] font-medium text-gray-700 dark:text-gray-200"
        timeClassName="truncate text-[10px] text-gray-500 dark:text-gray-400"
        as="p"
      />
    </div>
  );
}
