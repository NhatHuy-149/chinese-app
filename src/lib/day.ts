// Day and week arithmetic. A "day" starts at 04:00 local time (decided 2026-11-05),
// so practice at 1 a.m. still counts for the previous day. Weeks start on Monday.
export const DAY_START_HOUR = 4;
const MS_DAY = 86_400_000;

const pad = (n: number) => String(n).padStart(2, '0');

/** "YYYY-MM-DD" of the practice day containing `ts` (device time zone). */
export function dayKey(ts: number): string {
  const d = new Date(ts - DAY_START_HOUR * 3_600_000);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Day number (days since 1970-01-01) of a day key; safe for differences across DST and years. */
export function dayNum(key: string): number {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / MS_DAY);
}

export function keyFromNum(n: number): string {
  const d = new Date(n * MS_DAY);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export const todayKey = (now = Date.now()) => dayKey(now);
export const todayNum = (now = Date.now()) => dayNum(dayKey(now));

/** Day number of the Monday of the week containing day `n`. (1970-01-01 was a Thursday.) */
export function weekStartNum(n: number): number {
  const weekday = (n + 3) % 7; // 0 = Monday
  return n - weekday;
}

export function formatDayVi(key: string): string {
  const [y, m, d] = key.split('-');
  return `${Number(d)}/${Number(m)}/${y}`;
}

const WEEKDAYS = ['Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy', 'Chủ Nhật'];
export const weekdayVi = (n: number) => WEEKDAYS[(n + 3) % 7];
