import { describe, expect, it } from 'vitest';
import { dayKey, dayNum, keyFromNum, weekStartNum } from './day';
import type { PracticeEvent } from './events';
import { grade, isMastered, newCard, planToday } from './srs';
import {
  attendance, errorTrends, forecast, masteredAt, milestones, quality, streaks, totalsFor, volume, weeklySummary,
} from './stats';

// Builds an event at local time `iso` (no Z = device time zone).
let seq = 0;
function ev(iso: string, p: Partial<PracticeEvent>): PracticeEvent {
  return { v: 1, id: `e${seq++}`, ts: new Date(iso).getTime(), skill: 'vocab', kind: 'review', countsAsPractice: true, metrics: {}, ...p };
}
const n = (key: string) => dayNum(key);

describe('day', () => {
  it('starts the day at 04:00', () => {
    expect(dayKey(new Date('2026-11-05T03:59:00').getTime())).toBe('2026-11-04');
    expect(dayKey(new Date('2026-11-05T04:00:00').getTime())).toBe('2026-11-05');
  });
  it('handles weeks across the new year (Monday start)', () => {
    // 2026-12-31 is a Thursday; its week starts Monday 2026-12-28
    expect(keyFromNum(weekStartNum(n('2026-12-31')))).toBe('2026-12-28');
    expect(keyFromNum(weekStartNum(n('2027-01-03')))).toBe('2026-12-28'); // Sunday
    expect(keyFromNum(weekStartNum(n('2027-01-04')))).toBe('2027-01-04'); // Monday
  });
  it('round-trips day numbers', () => {
    expect(keyFromNum(n('2024-02-29'))).toBe('2024-02-29');
  });
});

describe('srs', () => {
  const t = 1000;
  it('moves up on correct and resets on wrong', () => {
    let c = newCard('w', 'zh2vi', t);
    c = grade(c, true, t); expect([c.box, c.due]).toEqual([1, t + 1]);
    c = grade(c, true, t + 1); expect([c.box, c.due]).toEqual([2, t + 3]);
    c = grade(c, false, t + 3); expect([c.box, c.due, c.lapses]).toEqual([1, t + 3, 1]);
  });
  it('needs both directions for mastery', () => {
    const zh = { ...newCard('w', 'zh2vi', t), box: 4 };
    const vi = { ...newCard('w', 'vi2zh', t), box: 3 };
    expect(isMastered([zh, vi])).toBe(false);
    expect(isMastered([zh, { ...vi, box: 4 }])).toBe(true);
  });
  it('stops new words when the backlog reaches the cap', () => {
    const cards = Array.from({ length: 10 }, (_, i) => newCard(`w${i}`, 'zh2vi', t - 1));
    expect(planToday({ cards, today: t, newPerDay: 20, reviewCap: 10, candidates: ['a', 'b'] }).newWordIds).toEqual([]);
    expect(planToday({ cards, today: t, newPerDay: 20, reviewCap: 100, candidates: ['a', 'b'] }).newWordIds).toEqual(['a', 'b']);
  });
  it('counts words introduced today against the daily limit', () => {
    const cards = [newCard('x', 'zh2vi', t), newCard('x', 'vi2zh', t)];
    expect(planToday({ cards, today: t, newPerDay: 2, reviewCap: 100, candidates: ['a', 'b', 'c'] }).newWordIds).toEqual(['a']);
  });
});

describe('stats', () => {
  it('is empty-safe', () => {
    expect(streaks([], 100)).toEqual({ current: 0, longest: 0 });
    expect(attendance([], 100)).toEqual({ practised: 0, total: 0 });
    expect(forecast([], 100, 2500)).toBeNull();
    expect(weeklySummary([], 100)).toBeNull();
    expect(totalsFor([]).vocab).toBe(0);
  });

  it('handles a single event', () => {
    const e = [ev('2026-11-05T10:00', { durationSec: 30 })];
    expect(streaks(e, n('2026-11-05'))).toEqual({ current: 1, longest: 1 });
    expect(totalsFor(e)).toMatchObject({ vocab: 1, minutes: 0.5 });
  });

  it('computes streaks with a gap and keeps yesterday streak alive before practising today', () => {
    const e = ['2026-11-01', '2026-11-02', '2026-11-03', '2026-11-05', '2026-11-06'].map(d => ev(`${d}T10:00`, {}));
    expect(streaks(e, n('2026-11-06'))).toEqual({ current: 2, longest: 3 });
    expect(streaks(e, n('2026-11-07')).current).toBe(2);
    expect(streaks(e, n('2026-11-08')).current).toBe(0);
  });

  it('does not count import events as practice', () => {
    const e = [ev('2026-11-01T10:00', { kind: 'import', countsAsPractice: false, itemId: 'a', metrics: { box: 4 } })];
    expect(totalsFor(e).vocab).toBe(0);
    expect(streaks(e, n('2026-11-01')).current).toBe(0);
    expect(masteredAt(e, n('2026-11-01')).has('a')).toBe(true);
  });

  it('excludes flagged events from quality', () => {
    const checks = Array.from({ length: 5 }, (_, i) =>
      ev('2026-11-05T10:00', { skill: 'write', kind: 'check', id: `w${i}`, metrics: { firstTryCorrect: i < 4, corrections: 1 } }));
    const flag = ev('2026-11-05T11:00', { skill: 'write', kind: 'flag', countsAsPractice: false, itemId: 'w4', metrics: { targetType: 'event' } });
    const day = n('2026-11-05');
    expect(quality(checks, 'writeFirstTry', day, day, 'day').points[0].value).toBe(80);
    const withFlag = quality([...checks, flag], 'writeFirstTry', day, day, 'day');
    expect(withFlag.points[0].value).toBeNull(); // 4 samples < MIN_SAMPLES
    expect(withFlag.total).toBe(4);
  });

  it('buckets volume by week across the year boundary', () => {
    const e = [ev('2026-12-31T10:00', { durationSec: 60 }), ev('2027-01-02T10:00', { durationSec: 120 })];
    const v = volume(e, n('2026-12-28'), n('2027-01-04'), 'week');
    expect(v.map(b => b.key)).toEqual(['2026-12-28', '2027-01-04']);
    expect(v[0].minutes.vocab).toBe(3);
  });

  it('replays mastery per direction', () => {
    const e = [
      ev('2026-11-01T10:00', { itemId: 'a', metrics: { direction: 'zh2vi', box: 4, correct: true } }),
      ev('2026-11-02T10:00', { itemId: 'a', metrics: { direction: 'vi2zh', box: 4, correct: true } }),
    ];
    expect(masteredAt(e, n('2026-11-01')).size).toBe(0);
    expect(masteredAt(e, n('2026-11-02')).size).toBe(1);
  });

  it('forecasts only with 14+ days of data', () => {
    const e: PracticeEvent[] = [];
    for (let d = 0; d < 20; d++) {
      const key = keyFromNum(n('2026-10-01') + d);
      e.push(ev(`${key}T10:00`, { itemId: `w${d}`, metrics: { direction: 'zh2vi', box: 4 } }));
      e.push(ev(`${key}T10:05`, { itemId: `w${d}`, metrics: { direction: 'vi2zh', box: 4 } }));
    }
    expect(forecast(e.slice(0, 20), n('2026-10-10'), 100)).toBeNull();
    const f = forecast(e, n('2026-10-20'), 100);
    expect(f?.perDay).toBe(1);
    expect(f?.days).toBe(80);
  });

  it('reports error trends against the previous period', () => {
    const e = [
      ev('2026-11-01T10:00', { skill: 'write', kind: 'check', errorTags: ['lượng từ', 'lượng từ'] }),
      ev('2026-11-08T10:00', { skill: 'write', kind: 'check', errorTags: ['lượng từ'] }),
    ];
    expect(errorTrends(e, n('2026-11-05'), n('2026-11-11'))).toEqual([{ tag: 'lượng từ', count: 1, previous: 2, trend: 'down' }]);
  });

  it('dates milestones', () => {
    const e = Array.from({ length: 50 }, (_, i) => ev(`2026-11-0${1 + (i % 3)}T10:00`, { skill: 'write', kind: 'check' }))
      .sort((a, b) => a.ts - b.ts);
    const m = milestones(e, 719);
    expect(m.find(x => x.label === '50 câu viết')?.reached).toBe('2026-11-03');
    expect(m.find(x => x.label === '100 câu viết')?.reached).toBeNull();
    expect(m.some(x => x.label === '719 từ đã thuộc')).toBe(true);
  });
});
