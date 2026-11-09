import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatScheduleCadenceDisplay,
  formatScheduleDateRange,
  formatSessionDisplay,
  sameTimeZone,
  wallTimeToUtcDate,
  weekdayInZone,
  ymdInZone,
} from './scheduleTime.js';

const RIYADH = 'Asia/Riyadh';
const KL = 'Asia/Kuala_Lumpur';
const LONDON = 'Europe/London';
const NYC = 'America/New_York';

/** Wed 2026-11-11 19:30–22:00 Asia/Riyadh cohort sample */
function sampleOccurrence() {
  return {
    timezone: RIYADH,
    startTime: '19:30',
    endTime: '22:00',
    sessions: [
      { date: '2026-11-11', startTime: '19:30', endTime: '22:00' },
      { date: '2026-11-18', startTime: '19:30', endTime: '22:00' },
      { date: '2027-01-27', startTime: '19:30', endTime: '22:00' },
    ],
  };
}

describe('wallTimeToUtcDate + zone shifts', () => {
  it('Riyadh Wed 19:30 → Kuala Lumpur Thu 00:30 (date + weekday shift)', () => {
    const utc = wallTimeToUtcDate('2026-11-11', '19:30', RIYADH);
    assert.ok(utc);
    assert.equal(ymdInZone(utc, KL), '2026-11-12');
    assert.equal(weekdayInZone(utc, KL), 4); // Thursday
    assert.equal(weekdayInZone(utc, RIYADH), 3); // Wednesday
  });

  it('Riyadh → London before UK DST ends (BST)', () => {
    // 2026-10-21 Wed 19:30 Riyadh (UTC+3) = 17:30 London (BST UTC+1)
    const utc = wallTimeToUtcDate('2026-10-21', '19:30', RIYADH);
    assert.ok(utc);
    assert.equal(ymdInZone(utc, LONDON), '2026-10-21');
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: LONDON,
        hour: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(utc)
        .find((p) => p.type === 'hour')?.value
    );
    assert.equal(hour, 17);
  });

  it('Riyadh → London after UK DST ends (GMT)', () => {
    // 2026-11-11 Wed 19:30 Riyadh (UTC+3) = 16:30 London (GMT UTC+0)
    const utc = wallTimeToUtcDate('2026-11-11', '19:30', RIYADH);
    assert.ok(utc);
    assert.equal(ymdInZone(utc, LONDON), '2026-11-11');
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: LONDON,
        hour: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(utc)
        .find((p) => p.type === 'hour')?.value
    );
    assert.equal(hour, 16);
  });

  it('Riyadh → New York (evening → afternoon)', () => {
    // 2026-11-11 19:30 Riyadh (GMT+3) = 11:30 New York (EST GMT-5)
    const utc = wallTimeToUtcDate('2026-11-11', '19:30', RIYADH);
    assert.ok(utc);
    assert.equal(ymdInZone(utc, NYC), '2026-11-11');
    const hour = Number(
      new Intl.DateTimeFormat('en-GB', {
        timeZone: NYC,
        hour: '2-digit',
        hourCycle: 'h23',
      })
        .formatToParts(utc)
        .find((p) => p.type === 'hour')?.value
    );
    assert.equal(hour, 11);
  });

  it('same zone identity', () => {
    assert.equal(sameTimeZone(RIYADH, RIYADH), true);
    assert.equal(sameTimeZone(RIYADH, KL), false);
  });
});

describe('formatScheduleCadenceDisplay', () => {
  it('same zone → single Makkah line', () => {
    const { primary, secondary, sameZone } = formatScheduleCadenceDisplay(sampleOccurrence(), {
      visitorZone: RIYADH,
      mounted: true,
      lang: 'en',
      labels: { everyWeekday: 'Every {day}', makkahTime: 'Makkah, GMT+3' },
    });
    assert.equal(sameZone, true);
    assert.equal(secondary, null);
    assert.match(primary, /Every Wednesday/i);
    assert.match(primary, /Makkah/i);
  });

  it('Riyadh → KL → Thursday visitor line + Wednesday Makkah secondary', () => {
    const { primary, secondary, sameZone } = formatScheduleCadenceDisplay(sampleOccurrence(), {
      visitorZone: KL,
      mounted: true,
      lang: 'en',
      labels: {
        everyWeekday: 'Every {day}',
        makkahTime: 'Makkah, GMT+3',
        makkahTimeLabel: 'Makkah time',
      },
    });
    assert.equal(sameZone, false);
    assert.match(primary, /Every Thursday/i);
    assert.match(primary, /your time/i);
    assert.ok(secondary);
    assert.match(secondary, /Wed/i);
    assert.match(secondary, /Makkah/i);
  });

  it('pre-mount shows schedule zone only', () => {
    const { secondary, sameZone } = formatScheduleCadenceDisplay(sampleOccurrence(), {
      visitorZone: KL,
      mounted: false,
      lang: 'en',
      labels: { everyWeekday: 'Every {day}', makkahTime: 'Makkah, GMT+3' },
    });
    assert.equal(sameZone, true);
    assert.equal(secondary, null);
  });
});

describe('formatScheduleDateRange + formatSessionDisplay', () => {
  it('date range shifts into visitor zone', () => {
    const range = formatScheduleDateRange(sampleOccurrence(), KL, 'en');
    // First session becomes Nov 12 in KL; last session Jan 27 22:00 Riyadh → Jan 28 01:00 KL
    assert.match(range, /Nov 12, 2026/);
    assert.match(range, /2027/);
  });

  it('session row converts weekday/time', () => {
    const row = formatSessionDisplay(
      { date: '2026-11-11', startTime: '19:30', endTime: '22:00' },
      RIYADH,
      KL,
      'en'
    );
    assert.match(row.dateLabel, /Thu/i);
    assert.match(row.dateLabel, /Nov 12/i);
  });
});
