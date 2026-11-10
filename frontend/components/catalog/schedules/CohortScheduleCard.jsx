'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { formatMoney } from '@/lib/catalog/schedules';
import {
  formatScheduleCadenceDisplay,
  formatScheduleDateRange,
  formatSessionDisplay,
} from '@/lib/catalog/scheduleTime';
import { pushDataLayer, createEventId } from '@/lib/tracking';
import { cn } from '@/lib/utils';

function trackSelectItem(course, occurrence, mode) {
  try {
    pushDataLayer('select_item', createEventId(), {
      content_name: course?.title,
      content_ids: [String(course?.id)],
      content_type: 'product',
      schedule_id: occurrence.scheduleId,
      occurrence_date: occurrence.occurrenceDate,
      value: occurrence.price,
      currency: occurrence.currency,
      item_variant: mode || occurrence.deliveryMode || undefined,
    });
  } catch {
    // non-blocking
  }
}

function timeSlotLabel(slot, labels) {
  if (slot === 'morning') return labels.morning || 'Morning';
  if (slot === 'afternoon') return labels.afternoon || 'Afternoon';
  if (slot === 'evening') return labels.evening || 'Evening';
  return slot || '';
}

function formatLabel(format, labels) {
  return labels.formats?.[format] || labels.deliveryFormats?.[format] || format;
}

export default function CohortScheduleCard({
  occurrence,
  course,
  lang,
  mode,
  labels,
  isEnrolled = false,
  timeMounted,
  visitorTimeZone,
}) {
  const [open, setOpen] = useState(false);
  const [photoFailed, setPhotoFailed] = useState(false);
  const effectiveMode = occurrence.deliveryMode || mode || 'live';
  const enrollHref = `/${lang}/checkout?course=${encodeURIComponent(course.slug)}&mode=${encodeURIComponent(effectiveMode)}&schedule=${occurrence.scheduleId}&date=${occurrence.occurrenceDate}`;
  const inquiryHref = `/${lang}/course-inquiry?course=${encodeURIComponent(course.slug)}&schedule=${occurrence.scheduleId}&date=${occurrence.occurrenceDate}`;

  const isSoldOut = occurrence.status === 'sold_out';
  const closed = occurrence.status === 'closed' || !occurrence.isBookable;
  const ctaDisabled = isEnrolled || closed;
  const ctaLabel = isEnrolled
    ? labels.alreadyEnrolled || 'You own this course'
    : isSoldOut
      ? labels.soldOut || 'Sold out'
      : occurrence.status === 'closed'
        ? labels.enrollmentClosed || 'Enrollment closed'
        : occurrence.ctaType === 'inquiry'
          ? labels.requestSeat || 'Request a seat'
          : labels.enrollNow || 'Enroll Now';
  const contactHref = `/${lang}/course-inquiry?course=${encodeURIComponent(course.slug)}`;

  const fillingFast =
    occurrence.showSeatsLeft &&
    occurrence.seatsLeft != null &&
    occurrence.seatsTotal != null &&
    occurrence.seatsTotal > 0 &&
    occurrence.seatsLeft <= Math.ceil(occurrence.seatsTotal * 0.2);

  const trainerInitials = (occurrence.trainer?.name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
  const showTrainerPhoto = Boolean(occurrence.trainer?.photo) && !photoFailed;

  const scheduleZone = occurrence.timezone || 'UTC';
  const displayZone =
    timeMounted && visitorTimeZone ? visitorTimeZone : scheduleZone;

  const dateRange = formatScheduleDateRange(occurrence, displayZone, lang);
  const cadence = formatScheduleCadenceDisplay(occurrence, {
    visitorZone: visitorTimeZone,
    mounted: timeMounted,
    lang,
    labels,
  });

  const grouped = useMemo(() => {
    const phases = occurrence.phases || [];
    const sessions = occurrence.sessions || [];
    if (phases.length === 0) {
      return [{ name: null, sessions }];
    }
    return phases
      .map((phase, index) => ({
        name: phase.name || `${labels.phase || 'Phase'} ${index + 1}`,
        sessions: sessions.filter((s) => s.phaseIndex === index),
      }))
      .filter((group) => group.sessions.length > 0);
  }, [occurrence.phases, occurrence.sessions, labels.phase]);

  const deliveryText = [
    formatLabel(occurrence.format, labels),
    occurrence.location ||
      (occurrence.format === 'online' ? labels.onlineClassroom || 'Online classroom' : null),
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <article className="max-w-full overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-purple-500/20 dark:bg-[#181124]/90">
      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,0.9fr)] lg:items-start">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {isSoldOut ? (
              <span className="inline-flex rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[11px] font-semibold text-red-800 dark:border-red-400/30 dark:bg-red-500/15 dark:text-red-100">
                {labels.soldOut || 'Sold out'}
              </span>
            ) : null}
            {occurrence.timeSlot ? (
              <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/15 dark:text-amber-100">
                {timeSlotLabel(occurrence.timeSlot, labels)}
              </span>
            ) : null}
            {occurrence.batchNumber != null ? (
              <span className="inline-flex rounded-full border border-plum-200 bg-plum-50 px-2.5 py-0.5 text-[11px] font-semibold text-plum-800 dark:border-plum-400/30 dark:bg-plum-500/15 dark:text-plum-100">
                {(labels.batchNumber || 'Batch {n}').replace('{n}', String(occurrence.batchNumber))}
              </span>
            ) : null}
          </div>

          <p className="break-words text-base font-bold text-gray-900 dark:text-white">
            {dateRange}
          </p>
          {/* Reserve two-line height to avoid layout jump on visitor-zone hydrate */}
          <div className="min-h-[2.75rem] space-y-0.5">
            <p className="break-words text-sm text-gray-700 dark:text-gray-200">
              {cadence.primary}
            </p>
            {cadence.secondary ? (
              <p className="break-words text-xs text-gray-500 dark:text-gray-400">
                {cadence.secondary}
              </p>
            ) : null}
          </div>
          {deliveryText ? (
            <p className="break-words text-xs text-gray-500 dark:text-gray-400">{deliveryText}</p>
          ) : null}
          <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
            {(labels.sessionsAndPhases || '{sessions} sessions · {phases} phases')
              .replace('{sessions}', String(occurrence.sessionCount || occurrence.sessions?.length || 0))
              .replace('{phases}', String(occurrence.phaseCount || occurrence.phases?.length || 0))}
          </p>

          {occurrence.trainer?.name ? (
            <div className="flex items-center gap-2 pt-1">
              {showTrainerPhoto ? (
                <img
                  src={occurrence.trainer.photo}
                  alt=""
                  width={40}
                  height={40}
                  loading="lazy"
                  className="h-10 w-10 shrink-0 rounded-full object-cover"
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <span
                  aria-hidden
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-plum-100 text-xs font-bold text-plum-800 dark:bg-plum-500/20 dark:text-plum-100"
                >
                  {trainerInitials}
                </span>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {occurrence.trainer.name}
                </div>
                {occurrence.trainer.title ? (
                  <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {occurrence.trainer.title}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="flex min-w-0 flex-col items-stretch gap-2 lg:items-end">
          {occurrence.discountPercent != null ? (
            <span className="inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-500/20 dark:text-amber-100">
              {occurrence.discountPercent}% OFF
            </span>
          ) : null}
          <div className="lg:text-end">
            {occurrence.originalPrice != null && occurrence.originalPrice > occurrence.price ? (
              <div className="text-xs text-gray-400 line-through">
                {formatMoney(occurrence.originalPrice, occurrence.currency, lang)}
              </div>
            ) : null}
            <div className="text-2xl font-extrabold text-plum-800 dark:text-gold-200">
              {formatMoney(occurrence.price, occurrence.currency, lang)}
            </div>
          </div>
          {occurrence.showSeatsLeft && occurrence.seatsLeft != null ? (
            <p
              className={cn(
                'text-sm',
                fillingFast
                  ? 'font-semibold text-amber-700 dark:text-amber-300'
                  : 'text-gray-600 dark:text-gray-300'
              )}
            >
              {fillingFast
                ? labels.fillingFast || 'Filling fast'
                : (labels.seatsLeft || '{n} seats left').replace(
                    '{n}',
                    String(occurrence.seatsLeft)
                  )}
            </p>
          ) : null}

          {ctaDisabled ? (
            <div className="flex w-full flex-col items-stretch gap-2 lg:items-end">
              <span
                className={cn(
                  'inline-flex min-h-11 items-center justify-center rounded-xl border px-4 text-sm font-semibold',
                  isSoldOut
                    ? 'border-red-200 bg-red-50 text-red-800 dark:border-red-400/30 dark:bg-red-500/10 dark:text-red-100'
                    : 'border-gray-200 bg-gray-50 text-gray-500 dark:border-white/10 dark:bg-white/5'
                )}
              >
                {ctaLabel}
              </span>
              {isSoldOut && !isEnrolled ? (
                <Link
                  href={contactHref}
                  className="text-center text-xs font-semibold text-plum-700 underline-offset-2 hover:underline dark:text-gold-300 lg:text-end"
                >
                  {labels.contactNextBatch || 'Contact us for the next batch'}
                </Link>
              ) : null}
            </div>
          ) : (
            <Link
              href={occurrence.ctaType === 'inquiry' ? inquiryHref : enrollHref}
              onClick={() => trackSelectItem(course, occurrence, effectiveMode)}
              className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-xl bg-gradient-to-r from-plum-700 to-plum-500 px-4 text-sm font-semibold text-white transition-all hover:from-plum-600 hover:to-plum-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 lg:w-auto"
            >
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>

      <div className="border-t border-gray-100 px-4 py-3 dark:border-white/10 sm:px-5">
        <button
          type="button"
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm font-semibold text-plum-700 transition-colors hover:text-plum-600 dark:text-gold-300"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {labels.viewAllSessions || 'View all sessions'}
          <ChevronDown
            className={cn('h-4 w-4 transition-transform duration-200', open && 'rotate-180')}
            aria-hidden
          />
        </button>

        {open ? (
          <div className="mt-3 max-w-full space-y-4">
            {grouped.map((group, groupIndex) => (
              <div key={groupIndex} className="min-w-0 space-y-2">
                {group.name ? (
                  <h4 className="text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {group.name}
                  </h4>
                ) : null}
                <ul className="divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-100 dark:divide-white/10 dark:border-white/10">
                  {group.sessions.map((session) => {
                    const row = formatSessionDisplay(
                      session,
                      scheduleZone,
                      displayZone,
                      lang
                    );
                    return (
                      <li
                        key={`${session.date}-${session.position}`}
                        className="grid min-w-0 gap-1 px-3 py-2.5 text-sm sm:grid-cols-[3rem_minmax(0,1.2fr)_minmax(0,1fr)_auto]"
                      >
                        <span className="font-semibold text-plum-700 dark:text-gold-300">
                          #{session.position || ''}
                        </span>
                        <span className="min-w-0 break-words font-medium text-gray-900 dark:text-white">
                          {session.title || '—'}
                        </span>
                        <span className="min-w-0 break-words text-gray-600 dark:text-gray-300">
                          {row.dateLabel}
                        </span>
                        <span className="min-w-0 break-words text-gray-500 dark:text-gray-400 sm:text-end">
                          {row.timeLabel}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            {occurrence.note ? (
              <p className="break-words rounded-xl bg-plum-50/70 px-3 py-2 text-sm text-plum-900 dark:bg-plum-500/10 dark:text-plum-100">
                {occurrence.note}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
