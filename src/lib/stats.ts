// All statistics are pure functions of the event log (definitions in STATS.md).
import { dayKey, dayNum, keyFromNum, weekStartNum } from './day';
import type { PracticeEvent, Skill } from './events';
import { MASTER_BOX } from './srs';

export const SKILLS: Skill[] = ['vocab', 'write', 'speak', 'listen'];
export const MIN_SAMPLES = 5;      // below this, no trend line is drawn
export const FORECAST_MIN_DAYS = 14;
const MAX_EVENT_SEC = 300;         // one event never counts for more than 5 minutes

export type DayTotals = { vocab: number; write: number; speak: number; listen: number; speakSec: number; minutes: number };

/** Event ids the learner flagged as a wrong AI result. */
export function flaggedIds(events: PracticeEvent[]): Set<string> {
  return new Set(events.filter(e => e.kind === 'flag' && e.metrics.targetType === 'event' && e.itemId).map(e => e.itemId!));
}

export const isPractice = (e: PracticeEvent) => e.countsAsPractice;
const dayOf = (e: PracticeEvent) => dayNum(dayKey(e.ts));
const minutesOf = (e: PracticeEvent) => Math.min(e.durationSec ?? 0, MAX_EVENT_SEC) / 60;

/**
 * A written sentence counts once it was retyped correctly: a "retype" event (or, in the older
 * single-event format used by sample data, a "check" event with retypeDone=true).
 */
export const isWrittenSentence = (e: PracticeEvent) =>
  e.skill === 'write' && (e.kind === 'retype' || (e.kind === 'check' && e.metrics.retypeDone === true));

/** Goal units: vocab = cards reviewed, write = sentences checked and retyped, speak = sentences spoken, listen = passages. */
function goalUnit(e: PracticeEvent): Partial<Record<Skill, number>> {
  if (e.skill === 'vocab' && (e.kind === 'review' || e.kind === 'new')) return { vocab: 1 };
  if (isWrittenSentence(e)) return { write: 1 };
  if (e.skill === 'speak' && (e.kind === 'shadow' || e.kind === 'free')) return { speak: 1 };
  if (e.skill === 'listen' && e.kind === 'gist') return { listen: 1 };
  return {};
}

export function totalsFor(events: PracticeEvent[]): DayTotals {
  const t: DayTotals = { vocab: 0, write: 0, speak: 0, listen: 0, speakSec: 0, minutes: 0 };
  for (const e of events) {
    if (!isPractice(e)) continue;
    const u = goalUnit(e);
    for (const s of SKILLS) t[s] += u[s] ?? 0;
    if (e.skill === 'speak') t.speakSec += Number(e.metrics.speakSec ?? 0);
    t.minutes += minutesOf(e);
  }
  return t;
}

export const eventsOnDay = (events: PracticeEvent[], n: number) => events.filter(e => dayOf(e) === n);
export const eventsBetween = (events: PracticeEvent[], from: number, to: number) =>
  events.filter(e => { const d = dayOf(e); return d >= from && d <= to; });

/** Day numbers with at least one practice event. */
export function practiceDays(events: PracticeEvent[]): Set<number> {
  return new Set(events.filter(isPractice).map(dayOf));
}

/** Current streak counts back from today, or from yesterday if today has no practice yet. */
export function streaks(events: PracticeEvent[], today: number): { current: number; longest: number } {
  const days = practiceDays(events);
  let start = days.has(today) ? today : today - 1;
  let current = 0;
  while (days.has(start)) { current++; start--; }
  let longest = 0, run = 0, prev = NaN;
  for (const d of [...days].sort((a, b) => a - b)) {
    run = d === prev + 1 ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = d;
  }
  return { current, longest };
}

export function firstDay(events: PracticeEvent[]): number | null {
  const p = events.filter(isPractice);
  return p.length ? Math.min(...p.map(dayOf)) : null;
}

/** Practised days / calendar days since the first practice day (inclusive). */
export function attendance(events: PracticeEvent[], today: number): { practised: number; total: number } {
  const first = firstDay(events);
  if (first === null) return { practised: 0, total: 0 };
  return { practised: practiceDays(events).size, total: today - first + 1 };
}

// --- mastery (replayed from vocab events) ------------------------------------------
/**
 * Mastered word ids at the end of day `until` (inclusive), replaying the box stored in each
 * vocab event. Import events set both directions to their box.
 */
export function masteredAt(events: PracticeEvent[], until: number): Set<string> {
  const boxes = new Map<string, { zh2vi: number; vi2zh: number }>();
  for (const e of events) {
    if (e.skill !== 'vocab' || !e.itemId || dayOf(e) > until) continue;
    const b = boxes.get(e.itemId) ?? { zh2vi: 0, vi2zh: 0 };
    const box = Number(e.metrics.box ?? 0);
    if (e.kind === 'import') { b.zh2vi = box; b.vi2zh = box; }
    else if (e.kind === 'review' || e.kind === 'new') {
      const dir = e.metrics.direction === 'vi2zh' ? 'vi2zh' : 'zh2vi';
      b[dir] = box;
    }
    boxes.set(e.itemId, b);
  }
  return new Set([...boxes].filter(([, b]) => b.zh2vi >= MASTER_BOX && b.vi2zh >= MASTER_BOX).map(([id]) => id));
}

// --- volume ---------------------------------------------------------------------------
export type VolumeBucket = { key: string; label: string; minutes: Record<Skill, number> };

/** Measured practice minutes per skill, bucketed by day or by week (Monday start). */
export function volume(events: PracticeEvent[], from: number, to: number, by: 'day' | 'week'): VolumeBucket[] {
  const buckets = new Map<number, VolumeBucket>();
  const start = by === 'week' ? weekStartNum(from) : from;
  for (let n = start; n <= to; n += by === 'week' ? 7 : 1) {
    const key = keyFromNum(n);
    buckets.set(n, { key, label: key.slice(5).split('-').reverse().join('/'), minutes: { vocab: 0, write: 0, speak: 0, listen: 0 } });
  }
  for (const e of eventsBetween(events, start, to)) {
    if (!isPractice(e)) continue;
    const n = by === 'week' ? weekStartNum(dayOf(e)) : dayOf(e);
    const b = buckets.get(n);
    if (b) b.minutes[e.skill] += minutesOf(e);
  }
  return [...buckets.values()];
}

export function heatmap(events: PracticeEvent[], today: number, weeks = 16): Array<{ n: number; key: string; minutes: number; future: boolean }> {
  const start = weekStartNum(today) - (weeks - 1) * 7;
  const perDay = new Map<number, number>();
  for (const e of events) if (isPractice(e)) perDay.set(dayOf(e), (perDay.get(dayOf(e)) ?? 0) + minutesOf(e));
  return Array.from({ length: weeks * 7 }, (_, i) => {
    const n = start + i;
    return { n, key: keyFromNum(n), minutes: perDay.get(n) ?? 0, future: n > today };
  });
}

// --- quality over time ------------------------------------------------------------------
export type QualityPoint = { key: string; label: string; value: number | null; n: number };
export type QualityMetric = 'vocabCorrect' | 'writeFirstTry' | 'writeCorrections' | 'speakMatch' | 'listenScore';

function qualityValue(metric: QualityMetric, e: PracticeEvent): number | null {
  switch (metric) {
    case 'vocabCorrect': return e.skill === 'vocab' && (e.kind === 'review' || e.kind === 'new') ? (e.metrics.correct ? 100 : 0) : null;
    case 'writeFirstTry': return e.skill === 'write' && e.kind === 'check' ? (e.metrics.firstTryCorrect ? 100 : 0) : null;
    case 'writeCorrections': return e.skill === 'write' && e.kind === 'check' ? Number(e.metrics.corrections ?? 0) : null;
    case 'speakMatch': return e.skill === 'speak' && e.kind === 'shadow' && typeof e.metrics.matchPct === 'number' ? e.metrics.matchPct : null;
    case 'listenScore': return e.skill === 'listen' && e.kind === 'gist' && typeof e.metrics.score === 'number' ? e.metrics.score : null;
  }
}

/** Average per bucket; flagged events are excluded; buckets under MIN_SAMPLES get value null. */
export function quality(events: PracticeEvent[], metric: QualityMetric, from: number, to: number, by: 'day' | 'week'): { points: QualityPoint[]; total: number } {
  const flagged = flaggedIds(events);
  const sums = new Map<number, { s: number; n: number }>();
  let total = 0;
  for (const e of eventsBetween(events, from, to)) {
    if (!isPractice(e) || flagged.has(e.id)) continue;
    const v = qualityValue(metric, e);
    if (v === null) continue;
    const n = by === 'week' ? weekStartNum(dayOf(e)) : dayOf(e);
    const cur = sums.get(n) ?? { s: 0, n: 0 };
    sums.set(n, { s: cur.s + v, n: cur.n + 1 });
    total++;
  }
  const points = volume([], from, to, by).map(b => {
    const n = dayNum(b.key);
    const cur = sums.get(n);
    return { key: b.key, label: b.label, n: cur?.n ?? 0, value: cur && cur.n >= MIN_SAMPLES ? cur.s / cur.n : null };
  });
  return { points, total };
}

// --- error tags -------------------------------------------------------------------------------
export function errorCounts(events: PracticeEvent[]): Map<string, number> {
  const flagged = flaggedIds(events);
  const m = new Map<string, number>();
  for (const e of events) {
    if (flagged.has(e.id)) continue;
    for (const t of e.errorTags ?? []) m.set(t, (m.get(t) ?? 0) + 1);
  }
  return m;
}

export type ErrorTrend = { tag: string; count: number; previous: number; trend: 'up' | 'down' | 'same' };

/** Top tags in [from, to] compared with the same-length period just before. */
export function errorTrends(events: PracticeEvent[], from: number, to: number, top = 5): ErrorTrend[] {
  const len = to - from + 1;
  const now = errorCounts(eventsBetween(events, from, to));
  const before = errorCounts(eventsBetween(events, from - len, from - 1));
  return [...now].sort((a, b) => b[1] - a[1]).slice(0, top).map(([tag, count]) => {
    const previous = before.get(tag) ?? 0;
    return { tag, count, previous, trend: count > previous ? 'up' : count < previous ? 'down' : 'same' };
  });
}

// --- forecast, milestones, weekly summary ----------------------------------------------------------
/** Days until `target` mastered words at the pace of the last 30 days; null when data is too thin. */
export function forecast(events: PracticeEvent[], today: number, target: number): { days: number; perDay: number } | null {
  const first = firstDay(events);
  if (first === null || today - first + 1 < FORECAST_MIN_DAYS) return null;
  const windowStart = Math.max(first, today - 29);
  const gained = masteredAt(events, today).size - masteredAt(events, windowStart - 1).size;
  const perDay = gained / (today - windowStart + 1);
  const remaining = target - masteredAt(events, today).size;
  if (perDay <= 0 || remaining <= 0) return null;
  return { days: Math.ceil(remaining / perDay), perDay };
}

export type Milestone = { label: string; reached: string | null };

export function milestones(events: PracticeEvent[], totalWords: number): Milestone[] {
  const out: Milestone[] = [];
  const practice = events.filter(isPractice);
  const days = [...new Set(events.map(dayOf))].sort((a, b) => a - b);

  // mastered words: first day the count reached each threshold
  const wordTargets = [100, 500, 1000, 1500, 2000, 2500].filter(t => t <= totalWords);
  if (!wordTargets.includes(totalWords) && totalWords > 0) wordTargets.push(totalWords);
  for (const t of wordTargets) {
    const d = days.find(n => masteredAt(events, n).size >= t);
    out.push({ label: `${t} từ đã thuộc`, reached: d !== undefined ? keyFromNum(d) : null });
  }
  const cumulative = (pred: (e: PracticeEvent) => number, threshold: number) => {
    let sum = 0;
    for (const e of practice) { sum += pred(e); if (sum >= threshold) return dayKey(e.ts); }
    return null;
  };
  for (const t of [50, 100, 500]) out.push({ label: `${t} câu viết`, reached: cumulative(e => (isWrittenSentence(e) ? 1 : 0), t) });
  for (const h of [1, 10]) out.push({ label: `${h} giờ nói`, reached: cumulative(e => (e.skill === 'speak' ? Number(e.metrics.speakSec ?? 0) : 0), h * 3600) });
  for (const t of [10, 50]) out.push({ label: `${t} đoạn nghe`, reached: cumulative(e => (e.skill === 'listen' && e.kind === 'gist' ? 1 : 0), t) });
  return out;
}

/** Three rule-based lines comparing the last full week with the week before (null if no data). */
export function weeklySummary(events: PracticeEvent[], today: number): string[] | null {
  const thisWeek = weekStartNum(today);
  const lastStart = thisWeek - 7, prevStart = thisWeek - 14;
  const last = eventsBetween(events, lastStart, thisWeek - 1).filter(isPractice);
  const prev = eventsBetween(events, prevStart, lastStart - 1).filter(isPractice);
  if (!last.length && !prev.length) return null;
  const mins = (es: PracticeEvent[]) => Math.round(es.reduce((a, e) => a + minutesOf(e), 0));
  const rate = (es: PracticeEvent[]) => {
    const v = es.filter(e => e.skill === 'vocab' && (e.kind === 'review' || e.kind === 'new'));
    return v.length >= MIN_SAMPLES ? Math.round((v.filter(e => e.metrics.correct).length / v.length) * 100) : null;
  };
  const lines: string[] = [];
  const [ml, mp] = [mins(last), mins(prev)];
  lines.push(`Khối lượng: ${ml} phút tuần trước${prev.length ? ` (tuần trước nữa ${mp} phút, ${ml >= mp ? 'tăng' : 'giảm'} ${Math.abs(ml - mp)} phút)` : ''}.`);
  const [rl, rp] = [rate(last), rate(prev)];
  lines.push(rl === null ? 'Chất lượng ôn từ: chưa đủ dữ liệu tuần trước.' : `Ôn từ đúng ${rl}%${rp !== null ? ` (trước đó ${rp}%)` : ''}.`);
  const top = [...errorCounts(last)].sort((a, b) => b[1] - a[1])[0];
  lines.push(top ? `Lỗi nổi bật: ${top[0]} (${top[1]} lần).` : 'Không ghi nhận lỗi nào tuần trước.');
  return lines;
}
