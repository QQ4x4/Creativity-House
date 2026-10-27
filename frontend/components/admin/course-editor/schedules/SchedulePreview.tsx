'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

import type { AdminOccurrenceDto } from '@/lib/admin/types';
import {
  ADMIN_PREVIEW_EXAMPLE_ZONES,
  formatOccurrencePrimary,
  formatTimezonePlaceName,
} from '@/lib/catalog/scheduleTime';
import { cn } from '@/lib/utils';

interface SchedulePreviewProps {
  occurrences: AdminOccurrenceDto[];
  loading?: boolean;
  locale?: 'en' | 'ar';
  onLocaleChange?: (locale: 'en' | 'ar') => void;
  /** IANA zone the admin is editing (batch wall clock). */
  scheduleTimezone?: string;
  className?: string;
}

function formatMoney(amount: number, currency: string, locale: string) {
  try {
    return new Intl.NumberFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

/**
 * Live list of generated dates + a compact public-style card for the first one.
 * Previous results stay mounted while a new preview loads (spinner overlay only).
 */
export function SchedulePreview({
  occurrences,
  loading = false,
  locale = 'en',
  onLocaleChange,
  scheduleTimezone,
  className,
}: SchedulePreviewProps) {
  const first = occurrences[0];
  const hasResults = occurrences.length > 0;
  const [photoFailed, setPhotoFailed] = useState(false);
  const zone = scheduleTimezone || first?.timezone || 'UTC';
  const schedulePrimary = first
    ? formatOccurrencePrimary(
        { startAt: first.start_at, endAt: first.end_at },
        zone,
        locale
      )
    : '';
  const visitorExamples = first
    ? ADMIN_PREVIEW_EXAMPLE_ZONES.filter((z) => z !== zone)
        .slice(0, 3)
        .map((z) => ({
          zone: z,
          place: formatTimezonePlaceName(z, locale),
          when: formatOccurrencePrimary(
            { startAt: first.start_at, endAt: first.end_at },
            z,
            locale
          ),
        }))
    : [];

  useEffect(() => {
    setPhotoFailed(false);
  }, [first?.trainer?.photo]);

  const trainerName =
    locale === 'ar'
      ? first?.trainer?.name_ar || first?.trainer?.name_en
      : first?.trainer?.name_en || first?.trainer?.name_ar;
  const trainerInitials = (trainerName || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('') || '?';
  const showTrainerPhoto = Boolean(first?.trainer?.photo) && !photoFailed;

  return (
    <div className={cn('relative space-y-4', className)}>
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Live preview</h3>
        {onLocaleChange ? (
          <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-white/10">
            {(['en', 'ar'] as const).map((code) => (
              <button
                key={code}
                type="button"
                aria-pressed={locale === code}
                onClick={() => onLocaleChange(code)}
                className={cn(
                  'min-h-8 rounded-md px-2.5 text-xs font-semibold uppercase',
                  locale === code
                    ? 'bg-plum-600 text-white'
                    : 'text-gray-600 dark:text-gray-300'
                )}
              >
                {code}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="relative min-h-[20rem]">
        {!hasResults && !loading ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Adjust the rule to see upcoming batches.
          </p>
        ) : null}

        {hasResults ? (
          <div className={cn(loading && 'opacity-60')}>
            <ol className="space-y-1.5 text-sm">
              {occurrences.slice(0, 12).map((occ) => {
                const dateLabel = (() => {
                  try {
                    return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-u-nu-latn' : 'en', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                      timeZone: zone,
                    }).format(new Date(occ.start_at));
                  } catch {
                    return occ.local_start_date;
                  }
                })();
                const batchPrefix =
                  occ.batch_number != null
                    ? locale === 'ar'
                      ? `الدفعة ${occ.batch_number} · `
                      : `Batch ${occ.batch_number} · `
                    : '';

                return (
                  <li
                    key={`${occ.schedule_id}-${occ.occurrence_date}`}
                    className="flex items-start justify-between gap-2 rounded-lg bg-gray-50 px-3 py-2 dark:bg-white/5"
                  >
                    <span className="text-gray-800 dark:text-gray-100">
                      {batchPrefix}
                      {dateLabel}
                      <span className="ms-2 text-xs text-gray-500">
                        {occ.start_time}–{occ.end_time} {occ.utc_offset_label}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-gray-500">{occ.status}</span>
                  </li>
                );
              })}
            </ol>

            {first ? (
              <div className="mt-4 rounded-2xl border border-gray-200 p-4 dark:border-white/10">
                {first.batch_number != null ? (
                  <div className="text-xs font-semibold uppercase tracking-wide text-plum-700 dark:text-gold-300">
                    {locale === 'ar' ? `الدفعة ${first.batch_number}` : `Batch ${first.batch_number}`}
                  </div>
                ) : null}
                <div className="mt-1 text-base font-bold text-gray-900 dark:text-white">
                  {schedulePrimary ||
                    `${first.local_start_date}${
                      first.duration_days > 1 ? ` – ${first.local_end_date}` : ''
                    }`}
                </div>
                <div className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {first.format}
                  {zone ? ` · ${zone}` : ''}
                </div>
                {visitorExamples.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-[11px] leading-snug text-gray-500 dark:text-gray-400">
                    {visitorExamples.map((ex) => (
                      <li key={ex.zone}>
                        {(locale === 'ar'
                          ? `الزوار في ${ex.place} يرون: ${ex.when}`
                          : `Visitors in ${ex.place} see: ${ex.when}`)}
                      </li>
                    ))}
                  </ul>
                ) : null}
                {first.trainer?.name_en || first.trainer?.name_ar || first.trainer?.photo ? (
                  <div className="mt-3 flex items-center gap-2">
                    {showTrainerPhoto ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={first.trainer.photo!}
                        alt=""
                        width={32}
                        height={32}
                        className="h-8 w-8 rounded-full object-cover ring-1 ring-black/5 dark:ring-white/10"
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
                        {trainerName}
                      </div>
                      {(locale === 'ar'
                        ? first.trainer.title_ar || first.trainer.title_en
                        : first.trainer.title_en || first.trainer.title_ar) ? (
                        <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                          {locale === 'ar'
                            ? first.trainer.title_ar || first.trainer.title_en
                            : first.trainer.title_en || first.trainer.title_ar}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
                <div className="mt-3 flex items-end justify-between gap-3">
                  <div>
                    {first.original_price != null && first.original_price > first.price ? (
                      <div className="text-xs text-gray-400 line-through">
                        {formatMoney(first.original_price, first.currency, locale)}
                      </div>
                    ) : null}
                    <div className="text-lg font-extrabold text-plum-800 dark:text-gold-200">
                      {formatMoney(first.price, first.currency, locale)}
                    </div>
                  </div>
                  <div className="rounded-xl bg-plum-600 px-3 py-2 text-xs font-semibold text-white">
                    {first.cta_type === 'inquiry'
                      ? locale === 'ar'
                        ? 'اطلب مقعدًا'
                        : 'Request a seat'
                      : locale === 'ar'
                        ? 'سجّل الآن'
                        : 'Enroll now'}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {loading ? (
          <div
            className="pointer-events-none absolute inset-0 flex items-start justify-center pt-8"
            aria-live="polite"
            aria-busy="true"
          >
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm dark:border-white/10 dark:bg-[#181124]/95 dark:text-gray-200">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              Updating preview…
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
