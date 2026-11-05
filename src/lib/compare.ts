// Character-level comparison used by retyping (Write) and shadowing (Speak).
import { normalizeZh } from './sentences';

export type DiffPart = { ch: string; ok: boolean };

/** Marks each character of `target` as matched (ok) or missing/wrong, via LCS alignment. */
export function diffChars(target: string, actual: string): { parts: DiffPart[]; matchPct: number } {
  const a = [...normalizeZh(target)], b = [...normalizeZh(actual)];
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const parts: DiffPart[] = [];
  let i = 0, j = 0;
  while (i < a.length) {
    if (j < b.length && a[i] === b[j]) { parts.push({ ch: a[i], ok: true }); i++; j++; }
    else if (j < b.length && dp[i][j + 1] >= dp[i + 1][j]) j++;
    else { parts.push({ ch: a[i], ok: false }); i++; }
  }
  // extra characters the learner added also lower the score
  const denom = Math.max(a.length, b.length) || 1;
  return { parts, matchPct: Math.round((dp[0][0] / denom) * 100) };
}

export const sameZh = (a: string, b: string) => normalizeZh(a) === normalizeZh(b);
