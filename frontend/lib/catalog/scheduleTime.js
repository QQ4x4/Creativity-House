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

/** @type {Map<string, Intl.DateTimeFormat>} */
const formatterCache = new Map();

/**
 * @param {string} locale
 * @param {Intl.DateTimeFormatOptions} options
 */
export function getCachedDateTimeFormat(locale, options) {
  const key = `${locale}|${JSON.stringify(options)}`;
  let fmt = formatterCache.get(key);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat(locale, options);
    formatterCache.set(key, fmt);
  }
  return fmt;
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
    return getCachedDateTimeFormat(dateLocale(lang), {
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

/**
 * @param {string|null|undefined} a
 * @param {string|null|undefined} b
 */
export function sameTimeZone(a, b) {
  return Boolean(a) && Boolean(b) && String(a) === String(b);
}

/**
 * Convert a wall-clock date+time in `timeZone` to a UTC Date (DST-safe).
 * @param {string} ymd YYYY-MM-DD
 * @param {string} hm HH:mm or HH:mm:ss
 * @param {string} timeZone
 * @returns {Date|null}
 */
export function wallTimeToUtcDate(ymd, hm, timeZone) {
  if (!ymd || !hm) return null;
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd).slice(0, 10));
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(String(hm).trim());
  if (!dateMatch || !timeMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);
  const second = Number(timeMatch[3] || 0);
  const zone = timeZone || 'UTC';

  // Iterate: treat desired wall time as UTC, then correct by the zone offset.
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 3; i += 1) {
    const parts = getCachedDateTimeFormat('en-CA', {
      timeZone: zone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date(utcMs));

    const read = (type) => Number(parts.find((p) => p.type === type)?.value || 0);
    const asUtc = Date.UTC(
      read('year'),
      read('month') - 1,
      read('day'),
      read('hour'),
      read('minute'),
      read('second')
    );
    const desired = Date.UTC(year, month - 1, day, hour, minute, second);
    utcMs += desired - asUtc;
  }

  const result = new Date(utcMs);
  return Number.isFinite(result.getTime()) ? result : null;
}

/**
 * @param {{ date?: string, startTime?: string, endTime?: string }} session
 * @param {string} scheduleZone
 * @returns {{ start: Date|null, end: Date|null }}
 */
export function sessionRangeToUtc(session, scheduleZone) {
  const start = wallTimeToUtcDate(
    session?.date || '',
    session?.startTime || '00:00',
    scheduleZone
  );
  const end = wallTimeToUtcDate(
    session?.date || '',
    session?.endTime || session?.startTime || '00:00',
    scheduleZone
  );
  return { start, end };
}

/**
 * @param {string|Date} iso
 * @param {string} timeZone
 * @param {string} [lang]
 */
export function formatWeekdayLong(iso, timeZone, lang = 'en') {
  return formatInZone(iso, timeZone, lang, { weekday: 'long' });
}

/**
 * @param {string|Date} iso
 * @param {string} timeZone
 * @param {string} [lang]
 */
export function formatWeekdayShort(iso, timeZone, lang = 'en') {
  return formatInZone(iso, timeZone, lang, { weekday: 'short' });
}

/**
 * @param {string|Date} iso
 * @param {string} timeZone
 * @param {string} [lang]
 */
export function formatClockInZone(iso, timeZone, lang = 'en') {
  return formatInZone(iso, timeZone, lang, {
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Calendar date like "Nov 12, 2026" / Arabic equivalent.
 * @param {string|Date} iso
 * @param {string} timeZone
 * @param {string} [lang]
 */
export function formatCalendarDateInZone(iso, timeZone, lang = 'en') {
  return formatInZone(iso, timeZone, lang, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Inclusive date range for a cohort/separate occurrence in `timeZone`.
 * @param {Record<string, unknown>} occurrence
 * @param {string} timeZone
 * @param {string} [lang]
 */
export function formatScheduleDateRange(occurrence, timeZone, lang = 'en') {
  const zone = timeZone || occurrence?.timezone || 'UTC';
  const sessions = Array.isArray(occurrence?.sessions) ? occurrence.sessions : [];
  const scheduleZone = occurrence?.timezone || zone;

  let startIso = occurrence?.startAt || null;
  let endIso = occurrence?.endAt || null;

  if (sessions.length > 0) {
    const first = sessionRangeToUtc(sessions[0], scheduleZone);
    const last = sessionRangeToUtc(sessions[sessions.length - 1], scheduleZone);
    if (first.start) startIso = first.start.toISOString();
    if (last.end) endIso = last.end.toISOString();
  }

  if (!startIso) return '';
  const startLabel = formatCalendarDateInZone(startIso, zone, lang);
  if (!endIso) return startLabel;
  const startYmd = ymdInZone(startIso, zone);
  const endYmd = ymdInZone(endIso, zone);
  if (startYmd && endYmd && startYmd !== endYmd) {
    return `${startLabel} – ${formatCalendarDateInZone(endIso, zone, lang)}`;
  }
  return startLabel;
}

/**
 * Friendly schedule-zone label (Makkah for Asia/Riyadh).
 * @param {string} timeZone
 * @param {string} [lang]
 * @param {Record<string, string>} [labels]
 */
export function formatScheduleZoneLabel(timeZone, lang = 'en', labels = {}) {
  if (timeZone === 'Asia/Riyadh') {
    return (
      labels.makkahTimeLabel ||
      labels.makkahTime ||
      (lang === 'ar' ? 'بتوقيت مكة المكرمة' : 'Makkah time')
    );
  }
  return formatTimezonePlaceName(timeZone, lang);
}

/**
 * @param {Record<string, unknown>} occurrence
 * @param {string} displayZone
 * @param {string} [lang]
 * @param {Record<string, string>} [labels]
 */
export function formatCadenceLine(occurrence, displayZone, lang = 'en', labels = {}) {
  const scheduleZone = occurrence?.timezone || 'UTC';
  const zone = displayZone || scheduleZone;
  const sessions = Array.isArray(occurrence?.sessions) ? occurrence.sessions : [];

  /** @type {Date[]} */
  const starts = [];
  if (sessions.length > 0) {
    sessions.forEach((session) => {
      const { start } = sessionRangeToUtc(session, scheduleZone);
      if (start) starts.push(start);
    });
  } else if (occurrence?.startAt) {
    starts.push(new Date(occurrence.startAt));
  }

  if (starts.length === 0) return '';

  const weekdayNames = [
    ...new Set(starts.map((d) => formatWeekdayLong(d, zone, lang)).filter(Boolean)),
  ];
  const every =
    weekdayNames.length === 1
      ? (labels.everyWeekday || (lang === 'ar' ? 'كل {day}' : 'Every {day}')).replace(
          '{day}',
          weekdayNames[0]
        )
      : weekdayNames.join(lang === 'ar' ? '، ' : ', ');

  const firstStart = starts[0];
  const firstEnd =
    sessions.length > 0
      ? sessionRangeToUtc(sessions[0], scheduleZone).end || firstStart
      : occurrence?.endAt
        ? new Date(occurrence.endAt)
        : firstStart;

  const startClock = formatClockInZone(firstStart, zone, lang);
  const endClock = formatClockInZone(firstEnd, zone, lang);
  const offset = formatGmtOffset(firstStart, zone, lang);

  const isVisitor = !sameTimeZone(zone, scheduleZone);
  let zoneParen;
  if (isVisitor) {
    zoneParen = lang === 'ar' ? `(بتوقيتك، ${offset})` : `(your time, ${offset})`;
  } else if (zone === 'Asia/Riyadh') {
    zoneParen =
      lang === 'ar'
        ? `(${labels.makkahTime || 'بتوقيت مكة المكرمة'})`
        : `(${labels.makkahTime || 'Makkah, GMT+3'})`;
  } else {
    zoneParen = `(${formatScheduleZoneLabel(zone, lang, labels)}, ${offset})`;
  }

  return `${every} · ${startClock} – ${endClock} ${zoneParen}`;
}

/**
 * Secondary line: short weekday + clocks in the schedule's own zone.
 * @param {Record<string, unknown>} occurrence
 * @param {string} [lang]
 * @param {Record<string, string>} [labels]
 */
export function formatScheduleZoneSecondaryLine(occurrence, lang = 'en', labels = {}) {
  const scheduleZone = occurrence?.timezone || 'UTC';
  const sessions = Array.isArray(occurrence?.sessions) ? occurrence.sessions : [];
  let start = occurrence?.startAt ? new Date(occurrence.startAt) : null;
  let end = null;

  if (sessions.length > 0) {
    const range = sessionRangeToUtc(sessions[0], scheduleZone);
    start = range.start;
    end = range.end;
  } else if (occurrence?.endAt) {
    end = new Date(occurrence.endAt);
  }

  if (!start || !Number.isFinite(start.getTime())) return '';

  const weekday = formatWeekdayShort(start, scheduleZone, lang);
  const startClock = formatClockInZone(start, scheduleZone, lang);
  const endClock = formatClockInZone(end || start, scheduleZone, lang);
  const offset = formatGmtOffset(start, scheduleZone, lang);
  const place = formatScheduleZoneLabel(scheduleZone, lang, labels);

  if (lang === 'ar') {
    if (scheduleZone === 'Asia/Riyadh') {
      return `${weekday} ${startClock} – ${endClock} ${labels.makkahTime || 'بتوقيت مكة المكرمة'}`;
    }
    return `${weekday} ${startClock} – ${endClock} ${place} (${offset})`;
  }

  if (scheduleZone === 'Asia/Riyadh') {
    return `${weekday} ${startClock} – ${endClock} ${labels.makkahTimeLabel || 'Makkah time'} (${offset || 'GMT+3'})`;
  }
  return `${weekday} ${startClock} – ${endClock} ${place} (${offset})`;
}

/**
 * Accept public (camelCase) or admin API (snake_case) occurrence shapes.
 * @param {object|null|undefined} raw
 */
export function normalizeOccurrenceForTime(raw) {
  if (!raw || typeof raw !== 'object') return null;
  /** @type {Record<string, any>} */
  const o = raw;
  const sessionsIn = Array.isArray(o.sessions) ? o.sessions : [];
  return {
    timezone: String(o.timezone || 'UTC'),
    startAt: o.startAt || o.start_at || null,
    endAt: o.endAt || o.end_at || null,
    startTime: o.startTime || o.start_time || null,
    endTime: o.endTime || o.end_time || null,
    localStartDate: o.localStartDate || o.local_start_date || null,
    localEndDate: o.localEndDate || o.local_end_date || null,
    sessions: sessionsIn.map((session) => ({
      date: String(session?.date || '').slice(0, 10),
      startTime: String(session?.startTime || session?.start_time || '').slice(0, 5),
      endTime: String(session?.endTime || session?.end_time || '').slice(0, 5),
      title: session?.title ?? session?.title_en ?? session?.title_ar ?? null,
      position: session?.position ?? null,
      phaseIndex: session?.phaseIndex ?? session?.phase_index ?? null,
    })),
  };
}

/**
 * Primary + optional secondary cadence lines (hydration-safe).
 * Before mount / when zones match → one line in schedule zone.
 * @param {Record<string, unknown>} occurrence
 * @param {{ visitorZone?: string|null, mounted?: boolean, lang?: string, labels?: Record<string, string> }} opts
 * @returns {{ primary: string, secondary: string|null, sameZone: boolean }}
 */
export function formatScheduleCadenceDisplay(occurrence, opts = {}) {
  const normalized = normalizeOccurrenceForTime(occurrence) || occurrence;
  const lang = opts.lang || 'en';
  const labels = opts.labels || {};
  const scheduleZone = normalized?.timezone || 'UTC';
  const mounted = Boolean(opts.mounted);
  const visitorZone = opts.visitorZone || scheduleZone;
  const sameZone = !mounted || sameTimeZone(visitorZone, scheduleZone);

  if (sameZone) {
    return {
      primary: formatCadenceLine(normalized, scheduleZone, lang, labels),
      secondary: null,
      sameZone: true,
    };
  }

  return {
    primary: formatCadenceLine(normalized, visitorZone, lang, labels),
    secondary: formatScheduleZoneSecondaryLine(normalized, lang, labels),
    sameZone: false,
  };
}

/**
 * Format one session row in a display zone.
 * @param {{ date?: string, startTime?: string, endTime?: string, title?: string|null }} session
 * @param {string} scheduleZone
 * @param {string} displayZone
 * @param {string} [lang]
 */
export function formatSessionDisplay(session, scheduleZone, displayZone, lang = 'en') {
  const { start, end } = sessionRangeToUtc(session, scheduleZone);
  if (!start) {
    return {
      dateLabel: session?.date || '',
      timeLabel: `${session?.startTime || ''} – ${session?.endTime || ''}`.trim(),
      weekday: '',
    };
  }
  const zone = displayZone || scheduleZone;
  return {
    dateLabel: formatInZone(start, zone, lang, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }),
    timeLabel: `${formatClockInZone(start, zone, lang)} – ${formatClockInZone(end || start, zone, lang)}`,
    weekday: formatWeekdayShort(start, zone, lang),
  };
}

/**
 * Date + time block for separate cards / sticky bar (two lines when zones differ).
 * @param {Record<string, unknown>} occurrence
 * @param {{ visitorZone?: string|null, mounted?: boolean, lang?: string, labels?: Record<string, string> }} opts
 */
export function formatOccurrenceWhenDisplay(occurrence, opts = {}) {
  const normalized = normalizeOccurrenceForTime(occurrence) || occurrence;
  const lang = opts.lang || 'en';
  const labels = opts.labels || {};
  const scheduleZone = normalized?.timezone || 'UTC';
  const mounted = Boolean(opts.mounted);
  const visitorZone = opts.visitorZone || scheduleZone;
  const sameZone = !mounted || sameTimeZone(visitorZone, scheduleZone);
  const zone = sameZone ? scheduleZone : visitorZone;

  const dateLine =
    formatScheduleDateRange(normalized, zone, lang) ||
    formatOccurrenceDateRange(normalized, zone, lang);
  const { start, end, offset } = formatOccurrenceTimeParts(normalized, zone, lang);
  const timeLine = [start && end ? `${start} – ${end}` : start, offset]
    .filter(Boolean)
    .join(' · ');

  let secondary = null;
  if (!sameZone) {
    const schedDate = formatScheduleDateRange(normalized, scheduleZone, lang);
    const schedParts = formatOccurrenceTimeParts(normalized, scheduleZone, lang);
    const schedTime = [
      schedParts.start && schedParts.end
        ? `${schedParts.start} – ${schedParts.end}`
        : schedParts.start,
      schedParts.offset,
    ]
      .filter(Boolean)
      .join(' · ');
    const place = formatScheduleZoneLabel(scheduleZone, lang, labels);
    secondary = [schedDate, schedTime, place].filter(Boolean).join(' · ');
  }

  return { dateLine, timeLine, secondary, sameZone, zone };
}
