'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

import type { AdminOccurrenceDto } from '@/lib/admin/types';
import { summarizeCohortSessions, type ScheduleFormValues } from '@/lib/admin/scheduleSchema';
import {
  formatScheduleCadenceDisplay,
  formatScheduleDateRange,
  formatSessionDisplay,
  normalizeOccurrenceForTime,
} from '@/lib/catalog/scheduleTime';
import { useVisitorTimeZone } from '@/hooks/useVisitorTimeZone';
import { cn } from '@/lib/utils';

interface CohortReviewPanelProps {
  values: ScheduleFormValues;
  preview: AdminOccurrenceDto[];
  locale: 'en' | 'ar';
  onLocaleChange: (locale: 'en' | 'ar') => void;
  warnings?: string[];
}

function money(amount: number | null | undefined, currency = 'USD') {
  if (amount == null) return '—';
  try {
    return new Intl.NumberFormat('en', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return String(amount);
  }
}

export function CohortReviewPanel({
  values,
  preview,
  locale,
  onLocaleChange,
  warnings = [],
}: CohortReviewPanelProps) {
  const [open, setOpen] = useState(true);
  const first = preview[0];
  const sessions = values.sessions ?? [];
  const phases = values.phases ?? [];
  const summary = summarizeCohortSessions(sessions, phases);
  const { mounted, timeZone: visitorZone } = useVisitorTimeZone();
  const scheduleZone = values.timezone || first?.timezone || 'UTC';
  const occurrenceForTime =
    normalizeOccurrenceForTime(first as object | null | undefined) ||
    normalizeOccurrenceForTime({
      timezone: scheduleZone,
      start_time: values.start_time,
      end_time: values.end_time,
      sessions: sessions.map((s) => ({
        date: s.date,
        start_time: s.start_time,
        end_time: s.end_time,
      })),
    });
  const displayZone = mounted ? visitorZone : scheduleZone;
  const dateRange = occurrenceForTime
    ? formatScheduleDateRange(occurrenceForTime, displayZone, locale)
    : '';
  const cadence = occurrenceForTime
    ? formatScheduleCadenceDisplay(occurrenceForTime, {
        visitorZone,
        mounted,
        lang: locale,
        labels: {
          everyWeekday: locale === 'ar' ? 'كل {day}' : 'Every {day}',
          makkahTime: locale === 'ar' ? 'بتوقيت مكة المكرمة' : 'Makkah, GMT+3',
          makkahTimeLabel: locale === 'ar' ? 'بتوقيت مكة المكرمة' : 'Makkah time',
        },
      })
    : null;

  const grouped = useMemo(() => {
    if (phases.length === 0) return [{ name: null as string | null, rows: sessions }];
    return phases
      .map((phase, index) => ({
        name: (locale === 'ar' ? phase.name_ar || phase.name_en : phase.name_en || phase.name_ar) ||
          `Phase ${index + 1}`,
        rows: sessions.filter((s) => s.phase_index === index),
      }))
      .filter((g) => g.rows.length > 0);
  }, [phases, sessions, locale]);

  const label =
    locale === 'ar'
      ? values.title_ar || values.title_en
      : values.title_en || values.title_ar;

  const trainerName = locale === 'ar'
    ? values.use_course_instructor
      ? first?.trainer?.name_ar || first?.trainer?.name_en
      : values.trainer_name_ar || values.trainer_name_en || first?.trainer?.name_ar || first?.trainer?.name_en
    : values.use_course_instructor
      ? first?.trainer?.name_en || first?.trainer?.name_ar
      : values.trainer_name_en || values.trainer_name_ar || first?.trainer?.name_en || first?.trainer?.name_ar;
  const trainerTitle = locale === 'ar'
    ? values.use_course_instructor
      ? first?.trainer?.title_ar || first?.trainer?.title_en
      : values.trainer_title_ar || values.trainer_title_en || first?.trainer?.title_ar || first?.trainer?.title_en
    : values.use_course_instructor
      ? first?.trainer?.title_en || first?.trainer?.title_ar
      : values.trainer_title_en || values.trainer_title_ar || first?.trainer?.title_en || first?.trainer?.title_ar;
  const trainerPhoto = values.use_course_instructor
    ? first?.trainer?.photo
    : values.trainer_photo || first?.trainer?.photo;
  const trainerInitials = (trainerName || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() || '')
    .join('');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold uppercase tracking-wide text-gray-500">Review</h3>
        <div className="flex rounded-lg border border-gray-200 p-0.5 dark:border-white/10">
          {(['en', 'ar'] as const).map((code) => (
            <button
              key={code}
              type="button"
              aria-pressed={locale === code}
              onClick={() => onLocaleChange(code)}
              className={cn(
                'min-h-8 cursor-pointer rounded-md px-2.5 text-xs font-semibold uppercase',
                locale === code ? 'bg-plum-600 text-white' : 'text-gray-600 dark:text-gray-300'
              )}
            >
              {code}
            </button>
          ))}
        </div>
      </div>

      {warnings.length > 0 ? (
        <ul className="space-y-2">
          {warnings.map((warning) => (
            <li
              key={warning}
              className="inline-flex w-full items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-400/30 dark:bg-amber-500/10 dark:text-amber-100"
            >
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              {warning}
            </li>
          ))}
        </ul>
      ) : null}

      <article className="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-500/15 dark:text-amber-100">
              {values.time_slot || first?.time_slot || 'evening'}
            </span>
            {values.batch_number != null ? (
              <span className="rounded-full bg-plum-50 px-2.5 py-0.5 text-[11px] font-semibold text-plum-800 dark:bg-plum-500/15 dark:text-plum-100">
                Batch {values.batch_number}
              </span>
            ) : null}
            {label ? (
              <span className="rounded-full border border-gray-200 px-2.5 py-0.5 text-[11px] font-medium dark:border-white/10">
                {label}
              </span>
            ) : null}
          </div>
          <p className="break-words text-sm font-semibold text-gray-900 dark:text-white">
            {dateRange || summary}
          </p>
          <div className="min-h-[2.75rem] space-y-0.5">
            {cadence?.primary ? (
              <p className="break-words text-sm text-gray-700 dark:text-gray-200">{cadence.primary}</p>
            ) : (
              <p className="break-words text-sm text-gray-700 dark:text-gray-200">{summary}</p>
            )}
            {cadence?.secondary ? (
              <p className="break-words text-xs text-gray-500 dark:text-gray-400">
                {cadence.secondary}
              </p>
            ) : null}
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {values.format === 'online'
              ? 'Live online'
              : values.format === 'hybrid'
                ? 'Hybrid'
                : 'In-person'}
            {values.location_en || values.location_ar
              ? ` · ${locale === 'ar' ? values.location_ar || values.location_en : values.location_en || values.location_ar}`
              : ''}
            {' · '}
            {values.timezone === 'Asia/Riyadh' ? 'Makkah time (GMT+3)' : values.timezone}
          </p>
          {trainerName || trainerPhoto ? (
            <div className="flex items-center gap-2 pt-1">
              {trainerPhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={trainerPhoto}
                  alt=""
                  width={40}
                  height={40}
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-plum-100 text-xs font-bold text-plum-800 dark:bg-plum-500/20 dark:text-plum-100"
                >
                  {trainerInitials}
                </span>
              )}
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-gray-900 dark:text-white">
                  {trainerName}
                </div>
                {trainerTitle ? (
                  <div className="truncate text-xs text-gray-500 dark:text-gray-400">
                    {trainerTitle}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <div className="flex items-end justify-between gap-3 pt-2">
            <div>
              {values.original_price != null &&
              values.price != null &&
              values.original_price > values.price ? (
                <div className="text-xs text-gray-400 line-through">
                  {money(values.original_price)}
                </div>
              ) : null}
              <div className="text-xl font-extrabold text-plum-800 dark:text-gold-200">
                {money(values.price ?? first?.price)}
              </div>
            </div>
            <span className="rounded-xl bg-plum-600 px-3 py-2 text-xs font-semibold text-white">
              Enroll Now
            </span>
          </div>
        </div>

        <div className="border-t border-gray-100 px-4 py-3 dark:border-white/10">
          <button
            type="button"
            className="min-h-11 cursor-pointer text-sm font-semibold text-plum-700 dark:text-gold-300"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            View all sessions {open ? '▴' : '▾'}
          </button>
          {open ? (
            <div className="mt-3 space-y-3">
              {grouped.map((group, gi) => (
                <div key={gi}>
                  {group.name ? (
                    <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-gray-500">
                      {group.name}
                    </h4>
                  ) : null}
                  <ul className="divide-y divide-gray-100 rounded-xl border border-gray-100 dark:divide-white/10 dark:border-white/10">
                    {group.rows.map((row, ri) => {
                      const converted = formatSessionDisplay(
                        {
                          date: row.date,
                          startTime: row.start_time,
                          endTime: row.end_time,
                        },
                        scheduleZone,
                        displayZone,
                        locale
                      );
                      return (
                      <li
                        key={`${row.date}-${ri}`}
                        className="grid min-w-0 gap-1 px-3 py-2 text-xs sm:grid-cols-[2rem_1fr_auto]"
                      >
                        <span className="font-semibold text-plum-700 dark:text-gold-300">
                          #{sessions.indexOf(row) + 1}
                        </span>
                        <span className="min-w-0 break-words">
                          {(locale === 'ar' ? row.title_ar || row.title_en : row.title_en || row.title_ar) ||
                            '—'}
                          <span className="ms-2 text-gray-500">{converted.dateLabel}</span>
                        </span>
                        <span className="break-words text-gray-500">
                          {converted.timeLabel}
                        </span>
                      </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {(locale === 'ar' ? values.notes_ar || values.notes_en : values.notes_en || values.notes_ar) ? (
                <p className="rounded-xl bg-plum-50/80 px-3 py-2 text-xs text-plum-900 dark:bg-plum-500/10 dark:text-plum-100">
                  {locale === 'ar' ? values.notes_ar || values.notes_en : values.notes_en || values.notes_ar}
                </p>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>
    </div>
  );
}
