/**
 * Normalize + format public schedule occurrences for the course page and checkout.
 */

/**
 * @param {Record<string, unknown>|null|undefined} raw
 * @param {'en'|'ar'} lang
 */
export function localizeOccurrence(raw, lang = 'en') {
  if (!raw || typeof raw !== 'object') return null;
  const ar = lang === 'ar';

  return {
    scheduleId: Number(raw.schedule_id ?? raw.scheduleId),
    occurrenceDate: String(raw.occurrence_date ?? raw.occurrenceDate ?? ''),
    startAt: String(raw.start_at ?? raw.startAt ?? ''),
    endAt: String(raw.end_at ?? raw.endAt ?? ''),
    timezone: String(raw.timezone || 'UTC'),
    utcOffsetLabel: String(raw.utc_offset_label ?? raw.utcOffsetLabel ?? ''),
    localStartDate: String(raw.local_start_date ?? raw.localStartDate ?? ''),
    localEndDate: String(raw.local_end_date ?? raw.localEndDate ?? ''),
    startTime: String(raw.start_time ?? raw.startTime ?? ''),
    endTime: String(raw.end_time ?? raw.endTime ?? ''),
    durationDays: Number(raw.duration_days ?? raw.durationDays ?? 1),
    timeSlot: String(raw.time_slot ?? raw.timeSlot ?? ''),
    format: String(raw.format || 'online'),
    location: ar
      ? raw.location_ar || raw.location_en || raw.location || null
      : raw.location_en || raw.location_ar || raw.location || null,
    batchNumber:
      raw.batch_number != null || raw.batchNumber != null
        ? Number(raw.batch_number ?? raw.batchNumber)
        : null,
    title: ar
      ? raw.title_ar || raw.title_en || raw.title || null
      : raw.title_en || raw.title_ar || raw.title || null,
    deliveryMode: raw.delivery_mode ?? raw.deliveryMode ?? null,
    price: Number(raw.price ?? 0),
    originalPrice:
      raw.original_price != null || raw.originalPrice != null
        ? Number(raw.original_price ?? raw.originalPrice)
        : null,
    currency: String(raw.currency || 'USD').toUpperCase(),
    discountPercent:
      raw.discount_percent != null || raw.discountPercent != null
        ? Number(raw.discount_percent ?? raw.discountPercent)
        : null,
    promoText: ar
      ? raw.promo_text_ar || raw.promo_text_en || null
      : raw.promo_text_en || raw.promo_text_ar || null,
    seatsTotal: raw.seats_total != null ? Number(raw.seats_total) : null,
    seatsLeft: raw.seats_left != null ? Number(raw.seats_left) : null,
    showSeatsLeft: Boolean(raw.show_seats_left ?? raw.showSeatsLeft),
    status: String(raw.status || 'open'),
    isBookable: Boolean(raw.is_bookable ?? raw.isBookable),
    ctaType: String(raw.cta_type ?? raw.ctaType ?? 'enroll'),
    showCountdown: raw.show_countdown !== false && raw.showCountdown !== false,
    isFeatured: Boolean(raw.is_featured ?? raw.isFeatured),
    trainer: {
      name: ar
        ? raw.trainer?.name_ar || raw.trainer?.name_en || null
        : raw.trainer?.name_en || raw.trainer?.name_ar || null,
      title: ar
        ? raw.trainer?.title_ar || raw.trainer?.title_en || null
        : raw.trainer?.title_en || raw.trainer?.title_ar || null,
      photo: raw.trainer?.photo || null,
    },
    note: ar ? raw.note_ar || raw.note_en || null : raw.note_en || raw.note_ar || null,
    isException: Boolean(raw.is_exception ?? raw.isException),
  };
}

/**
 * @param {unknown[]} list
 * @param {'en'|'ar'} lang
 */
export function localizeOccurrences(list, lang = 'en') {
  if (!Array.isArray(list)) return [];
  return list.map((item) => localizeOccurrence(item, lang)).filter(Boolean);
}

export function formatMoney(amount, currency, lang = 'en') {
  try {
    return new Intl.NumberFormat(lang === 'ar' ? 'ar-u-nu-latn' : 'en', {
      style: 'currency',
      currency: currency || 'USD',
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(Number(amount) || 0);
  } catch {
    return `${currency || 'USD'} ${amount}`;
  }
}

/**
 * Countdown parts from now → startAt.
 * @returns {{ weeks: number, days: number, hours: number, minutes: number, seconds: number, totalMs: number }|null}
 */
export function countdownParts(startAt, nowMs) {
  const start = new Date(startAt).getTime();
  if (!Number.isFinite(start)) return null;
  const totalMs = Math.max(0, start - nowMs);
  const totalSeconds = Math.floor(totalMs / 1000);
  const weeks = Math.floor(totalSeconds / (7 * 24 * 3600));
  const days = Math.floor((totalSeconds % (7 * 24 * 3600)) / (24 * 3600));
  const hours = Math.floor((totalSeconds % (24 * 3600)) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { weeks, days, hours, minutes, seconds, totalMs };
}

export function formatCountdownLabel(parts, lang = 'en') {
  if (!parts) return '';
  const { weeks, days, hours, minutes, seconds, totalMs } = parts;
  const pad = (n) => String(n).padStart(2, '0');

  if (totalMs >= 14 * 24 * 3600 * 1000) {
    return lang === 'ar' ? `${weeks}أ ${days}ي` : `${weeks}w ${days}d`;
  }
  if (totalMs >= 24 * 3600 * 1000) {
    return lang === 'ar'
      ? `${weeks * 7 + days}ي ${pad(hours)}س ${pad(minutes)}د`
      : `${weeks * 7 + days}d ${pad(hours)}h ${pad(minutes)}m`;
  }
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function isWeekendBatch(occurrence) {
  // All calendar days of the batch fall on Fri/Sat or Sat/Sun.
  const start = new Date(`${occurrence.localStartDate}T12:00:00Z`);
  const days = Math.max(1, occurrence.durationDays || 1);
  const dows = [];
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    dows.push(d.getUTCDay()); // 0=Sun … 6=Sat
  }
  const unique = [...new Set(dows)];
  const friSat = unique.every((d) => d === 5 || d === 6);
  const satSun = unique.every((d) => d === 0 || d === 6);
  return friSat || satSun;
}

export function isWeekdayBatch(occurrence) {
  const start = new Date(`${occurrence.localStartDate}T12:00:00Z`);
  const days = Math.max(1, occurrence.durationDays || 1);
  for (let i = 0; i < days; i += 1) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    const dow = d.getUTCDay();
    if (dow === 0 || dow === 6) return false;
  }
  return true;
}

/**
 * EN: 1 result / N results.
 * AR plural categories for نتيجة: 0, 1, 2, 3–10 (few), 11+ (many).
 *
 * @param {number} count
 * @param {'en'|'ar'} lang
 * @param {Record<string, string|undefined>} [labels]
 */
export function formatResultsCount(count, lang = 'en', labels = {}) {
  const n = Math.max(0, Number(count) || 0);

  if (lang === 'ar') {
    if (n === 0) return labels.resultsCountZero || 'لا نتائج';
    if (n === 1) return labels.resultsCountOne || 'نتيجة واحدة';
    if (n === 2) return labels.resultsCountTwo || 'نتيجتان';
    if (n >= 3 && n <= 10) {
      return (labels.resultsCountFew || '{n} نتائج').replace('{n}', String(n));
    }
    return (labels.resultsCountMany || '{n} نتيجة').replace('{n}', String(n));
  }

  if (n === 1) {
    return (labels.resultsCountOne || '{n} result').replace('{n}', String(n));
  }
  return (labels.resultsCount || '{n} results').replace('{n}', String(n));
}

/**
 * Pick featured or soonest bookable for the selected mode.
 */
export function pickFeaturedOccurrence(occurrences, mode) {
  const list = (occurrences || []).filter(
    (o) =>
      o.isBookable &&
      (o.deliveryMode == null || o.deliveryMode === '' || o.deliveryMode === mode)
  );
  if (list.length === 0) return null;
  const featured = list.find((o) => o.isFeatured);
  return featured || list[0];
}
