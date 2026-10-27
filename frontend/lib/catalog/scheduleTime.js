/**
 * Visitor timezone helpers for public schedule cards and filters.
 * All wall-clock formatting comes from start_at / end_at (UTC ISO).
 */

/**
 * @param {string} [lang]
 */
export function dateLocale(lang = 'en') {
  return lang === 'ar' ? 'ar-u-nu-latn' : 'en';
}

/**
 * @returns {string|null}
 */
export function readVisitorTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch {
    return null;
  }
}

/**
 * Calendar Y-m-d of an instant in a given IANA zone.
 * @param {string|Date} iso
 * @param {string} timeZone
 */
export function ymdInZone(iso, timeZone) {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timeZone || 'UTC',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).formatToParts(date);
    const y = parts.find((p) => p.type === 'year')?.value;
    const m = parts.find((p) => p.type === 'month')?.value;
    const d = parts.find((p) => p.type === 'day')?.value;
    if (!y || !m || !d) return '';
    return `${y}-${m}-${d}`;
  } catch {
    return '';
  }
}

/**
 * "Today" as Y-m-d in any timezone (used by admin past-date guards).
 * @param {string} timeZone
 */
export function todayInTimeZone(timeZone) {
  return ymdInZone(new Date(), timeZone || 'UTC');
}

/**
 * Hour 0–23 of an instant in a zone.
 * @param {string|Date} iso
 * @param {string} timeZone
 */
export function hourInZone(iso, timeZone) {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (!Number.isFinite(date.getTime())) return 0;
  try {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: timeZone || 'UTC',
      hour: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    return Number(parts.find((p) => p.type === 'hour')?.value || 0);
  } catch {
    return date.getUTCHours();
  }
}

/**
 * Weekday 0=Sun … 6=Sat in a zone.
 * @param {string|Date} iso
 * @param {string} timeZone
 */
export function weekdayInZone(iso, timeZone) {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (!Number.isFinite(date.getTime())) return 0;
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'UTC',
      weekday: 'short',
    }).formatToParts(date);
    const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    return map[parts.find((p) => p.type === 'weekday')?.value || 'Sun'] ?? 0;
  } catch {
    return date.getUTCDay();
  }
}

/**
 * Short offset like GMT+3 / GMT+8.
 * @param {string|Date} iso
 * @param {string} timeZone
 * @param {string} [lang]
 */
export function formatGmtOffset(iso, timeZone, lang = 'en') {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat(dateLocale(lang), {
      timeZone: timeZone || 'UTC',
      timeZoneName: 'shortOffset',
    }).formatToParts(date);
    const raw = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    return raw.replace(/^UTC/, 'GMT').replace(/([+-])0(\d)(?::00)?$/, '$1$2') || 'GMT';
  } catch {
    return '';
  }
}

/**
 * Friendly place name for an IANA zone (EN/AR) — admin preview examples.
 * @param {string} timeZone
 * @param {string} [lang]
 */
export function formatTimezonePlaceName(timeZone, lang = 'en') {
  const zone = timeZone || 'UTC';
  try {
    if (typeof Intl !== 'undefined' && 'DisplayNames' in Intl) {
      const names = new Intl.DisplayNames([lang === 'ar' ? 'ar' : 'en'], {
        type: 'timeZone',
      });
      const label = names.of(zone);
      if (label) return label;
    }
  } catch {
    // fall through
  }

  const fallback = {
    'Asia/Kuala_Lumpur': { en: 'Malaysia', ar: 'ماليزيا' },
    'Asia/Riyadh': { en: 'Riyadh', ar: 'الرياض' },
    'Asia/Dubai': { en: 'Dubai', ar: 'دبي' },
    'Europe/London': { en: 'London', ar: 'لندن' },
    'America/New_York': { en: 'New York', ar: 'نيويورك' },
    UTC: { en: 'UTC', ar: 'التوقيت العالمي' },
  };
  const row = fallback[zone];
  if (row) return lang === 'ar' ? row.ar : row.en;
  return zone.replace(/_/g, ' ').split('/').pop() || zone;
}

/**
 * @param {string|Date} iso
 * @param {string} timeZone
 * @param {string} lang
 * @param {Intl.DateTimeFormatOptions} options
 */
export function formatInZone(iso, timeZone, lang, options) {
  const date = iso instanceof Date ? iso : new Date(iso);
  if (!Number.isFinite(date.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(dateLocale(lang), {
      timeZone: timeZone || 'UTC',
      ...options,
    }).format(date);
  } catch {
    return '';
  }
}

/**
 * Line 1: "Tue, Oct 27 – Sat, Oct 31" (or a single day).
 * @param {{ startAt?: string, endAt?: string }} occurrence
 * @param {string} timeZone
 * @param {string} [lang]
 */
export function formatOccurrenceDateRange(occurrence, timeZone, lang = 'en') {
  if (!occurrence?.startAt) return '';
  const zone = timeZone || 'UTC';
  const startDate = formatInZone(occurrence.startAt, zone, lang, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
  const endDate = occurrence.endAt
    ? formatInZone(occurrence.endAt, zone, lang, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      })
    : startDate;
  const startYmd = ymdInZone(occurrence.startAt, zone);
  const endYmd = occurrence.endAt ? ymdInZone(occurrence.endAt, zone) : startYmd;
  if (startYmd && endYmd && startYmd !== endYmd) {
    return `${startDate} – ${endDate}`;
  }
  return startDate;
}

/**
 * Line 2 parts: start / end / GMT offset (each rendered with whitespace-nowrap).
 * @param {{ startAt?: string, endAt?: string }} occurrence
 * @param {string} timeZone
 * @param {string} [lang]
 * @returns {{ start: string, end: string, offset: string }}
 */
export function formatOccurrenceTimeParts(occurrence, timeZone, lang = 'en') {
  if (!occurrence?.startAt) return { start: '', end: '', offset: '' };
  const zone = timeZone || 'UTC';
  const start = formatInZone(occurrence.startAt, zone, lang, {
    hour: 'numeric',
    minute: '2-digit',
  });
  const end = occurrence.endAt
    ? formatInZone(occurrence.endAt, zone, lang, {
        hour: 'numeric',
        minute: '2-digit',
      })
    : start;
  const offset = formatGmtOffset(occurrence.startAt, zone, lang);
  return { start, end, offset };
}

/**
 * Single-line admin preview helper (date · time · offset).
 * @param {{ startAt?: string, endAt?: string }} occurrence
 * @param {string} timeZone
 * @param {string} [lang]
 */
export function formatOccurrencePrimary(occurrence, timeZone, lang = 'en') {
  const datePart = formatOccurrenceDateRange(occurrence, timeZone, lang);
  const { start, end, offset } = formatOccurrenceTimeParts(occurrence, timeZone, lang);
  if (!datePart) return '';
  return [datePart, `${start} – ${end}`, offset].filter(Boolean).join(' · ');
}

/**
 * Calendar days (0=Sun…6=Sat) spanned by the batch in `timeZone`.
 * @param {{ startAt?: string, endAt?: string }} occurrence
 * @param {string} timeZone
 * @returns {number[]}
 */
export function batchWeekdaysInZone(occurrence, timeZone) {
  if (!occurrence?.startAt) return [];
  const zone = timeZone || 'UTC';
  const startYmd = ymdInZone(occurrence.startAt, zone);
  const endYmd = occurrence.endAt ? ymdInZone(occurrence.endAt, zone) : startYmd;
  if (!startYmd) return [];

  const days = [];
  let cursor = startYmd;
  for (let i = 0; i < 400; i += 1) {
    const probe = new Date(`${cursor}T12:00:00Z`);
    days.push(weekdayInZone(probe, zone));
    if (!endYmd || cursor >= endYmd) break;
    const next = new Date(`${cursor}T12:00:00Z`);
    next.setUTCDate(next.getUTCDate() + 1);
    cursor = next.toISOString().slice(0, 10);
  }
  return days;
}

export function isWeekendBatchInZone(occurrence, timeZone) {
  const dows = [...new Set(batchWeekdaysInZone(occurrence, timeZone))];
  if (dows.length === 0) return false;
  const friSat = dows.every((d) => d === 5 || d === 6);
  const satSun = dows.every((d) => d === 0 || d === 6);
  return friSat || satSun;
}

export function isWeekdayBatchInZone(occurrence, timeZone) {
  const dows = batchWeekdaysInZone(occurrence, timeZone);
  if (dows.length === 0) return false;
  return dows.every((d) => d !== 0 && d !== 6);
}

/**
 * Morning / afternoon / evening from the visitor-converted start hour.
 * @param {{ startAt?: string }} occurrence
 * @param {string} timeZone
 */
export function effectiveTimeSlot(occurrence, timeZone) {
  const hour = hourInZone(occurrence.startAt, timeZone || 'UTC');
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

/**
 * @param {{ startAt?: string }} occurrence
 * @param {string} timeZone
 */
export function monthKeyInZone(occurrence, timeZone) {
  return ymdInZone(occurrence.startAt, timeZone).slice(0, 7);
}

/**
 * @param {string} timeZone
 */
export function currentAndNextMonthKeys(timeZone) {
  const today = todayInTimeZone(timeZone);
  const thisMonth = today.slice(0, 7);
  const [y, m] = thisMonth.split('-').map(Number);
  const next = m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, '0')}`;
  return { thisMonth, nextMonth: next };
}

/** Example visitor zones for the admin live preview. */
export const ADMIN_PREVIEW_EXAMPLE_ZONES = [
  'Asia/Riyadh',
  'Europe/London',
  'America/New_York',
];
