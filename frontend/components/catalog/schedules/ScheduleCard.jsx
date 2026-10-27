'use client';

import { useState } from 'react';
import Link from 'next/link';
import { formatMoney } from '@/lib/catalog/schedules';
import { pushDataLayer, createEventId } from '@/lib/tracking';
import OccurrenceWhen from './OccurrenceWhen';
import ScheduleCountdown from './ScheduleCountdown';

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

function statusMessage(occurrence, labels) {
  if (occurrence.status === 'sold_out') return labels.soldOut || 'Sold out';
  if (occurrence.status === 'closed') return labels.enrollmentClosed || 'Enrollment closed';
  if (occurrence.status === 'started') return labels.started || 'Started';
  if (occurrence.status === 'ended') return labels.ended || 'Ended';
  if (occurrence.status === 'few_seats' && occurrence.seatsLeft != null) {
    return (labels.onlySeatsLeft || 'Only {n} seats left').replace(
      '{n}',
      String(occurrence.seatsLeft)
    );
  }
  return null;
}

export default function ScheduleCard({
  occurrence,
  course,
  lang,
  mode,
  labels,
  now,
  isEnrolled = false,
  timeMounted,
  visitorTimeZone,
}) {
  const statusMsg = statusMessage(occurrence, labels);
  const effectiveMode = occurrence.deliveryMode || mode || 'live';

  const enrollHref = `/${lang}/checkout?course=${encodeURIComponent(course.slug)}&mode=${encodeURIComponent(effectiveMode)}&schedule=${occurrence.scheduleId}&date=${occurrence.occurrenceDate}`;
  const inquiryHref = `/${lang}/course-inquiry?course=${encodeURIComponent(course.slug)}&schedule=${occurrence.scheduleId}&date=${occurrence.occurrenceDate}`;

  const ctaDisabled = isEnrolled || !occurrence.isBookable;
  const ctaLabel = isEnrolled
    ? labels.alreadyEnrolled || 'You own this course'
    : occurrence.ctaType === 'inquiry'
      ? labels.requestSeat || 'Request a seat'
      : !occurrence.isBookable
        ? statusMsg || labels.soldOut || 'Unavailable'
        : labels.enrollNow || 'Enroll now';

  const trainerInitials = (occurrence.trainer?.name || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');
  const [photoFailed, setPhotoFailed] = useState(false);
  const showTrainerPhoto = Boolean(occurrence.trainer?.photo) && !photoFailed;

  return (
    <article className="relative overflow-hidden rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-purple-500/20 dark:bg-[#181124]/90 sm:p-5">
      {occurrence.showCountdown ? (
        <div className="absolute end-3 top-3 z-10">
          <ScheduleCountdown
            startAt={occurrence.startAt}
            now={now}
            lang={lang}
            labels={labels}
          />
        </div>
      ) : null}

      <div className="grid gap-4 pe-24 md:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.9fr)] md:items-center md:pe-28">
        <div className="min-w-0 space-y-2">
          {occurrence.batchNumber != null ? (
            <span className="inline-flex rounded-full border border-plum-200 bg-plum-50 px-2.5 py-0.5 text-[11px] font-semibold text-plum-800 dark:border-plum-400/30 dark:bg-plum-500/15 dark:text-plum-100">
              {(labels.batchNumber || 'Batch {n}').replace('{n}', String(occurrence.batchNumber))}
            </span>
          ) : null}
          <OccurrenceWhen
            occurrence={occurrence}
            lang={lang}
            mounted={timeMounted}
            timeZone={visitorTimeZone}
          />
          {occurrence.format ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">{occurrence.format}</p>
          ) : null}
          {occurrence.trainer?.name ? (
            <div className="flex items-center gap-2 pt-1">
              {showTrainerPhoto ? (
                <img
                  src={occurrence.trainer.photo}
                  alt=""
                  width={32}
                  height={32}
                  loading="lazy"
                  className="h-8 w-8 rounded-full object-cover"
                  onError={() => setPhotoFailed(true)}
                />
              ) : (
                <span
                  aria-hidden
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-plum-100 text-xs font-bold text-plum-800 dark:bg-plum-500/20 dark:text-plum-100"
                >
                  {trainerInitials}
                </span>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-gray-800 dark:text-gray-100">
                  {occurrence.trainer.name}
                </div>
                {occurrence.trainer.title ? (
                  <div className="truncate text-xs text-gray-500">{occurrence.trainer.title}</div>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        <div className="space-y-1 text-sm">
          {occurrence.showSeatsLeft && occurrence.seatsLeft != null ? (
            <p
              className={
                occurrence.status === 'few_seats'
                  ? 'font-semibold text-amber-700 dark:text-amber-300'
                  : 'text-gray-600 dark:text-gray-300'
              }
            >
              {statusMsg && occurrence.status === 'few_seats'
                ? statusMsg
                : (labels.seatsLeft || '{n} seats left').replace(
                    '{n}',
                    String(occurrence.seatsLeft)
                  )}
            </p>
          ) : null}
          {occurrence.promoText ? (
            <p className="text-gray-600 dark:text-gray-300">{occurrence.promoText}</p>
          ) : null}
        </div>

        <div className="flex flex-col items-stretch gap-2 md:items-end">
          {occurrence.discountPercent != null ? (
            <span className="inline-flex w-fit rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900 dark:bg-amber-500/20 dark:text-amber-100 md:ms-auto">
              {occurrence.discountPercent}% OFF
            </span>
          ) : null}
          <div className="md:text-end">
            {occurrence.originalPrice != null && occurrence.originalPrice > occurrence.price ? (
              <div className="text-xs text-gray-400 line-through">
                {formatMoney(occurrence.originalPrice, occurrence.currency, lang)}
              </div>
            ) : null}
            <div className="text-xl font-extrabold text-plum-800 dark:text-gold-200">
              {formatMoney(occurrence.price, occurrence.currency, lang)}
            </div>
          </div>

          {ctaDisabled && isEnrolled ? (
            <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-semibold text-emerald-800 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:text-emerald-200">
              {ctaLabel}
            </span>
          ) : ctaDisabled ? (
            <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-gray-200 bg-gray-50 px-4 text-sm font-semibold text-gray-500 dark:border-white/10 dark:bg-white/5">
              {ctaLabel}
            </span>
          ) : (
            <Link
              href={occurrence.ctaType === 'inquiry' ? inquiryHref : enrollHref}
              onClick={() => trackSelectItem(course, occurrence, effectiveMode)}
              className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-gradient-to-r from-plum-700 to-plum-500 px-4 text-sm font-semibold text-white transition-all hover:from-plum-600 hover:to-plum-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 md:w-auto"
            >
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
