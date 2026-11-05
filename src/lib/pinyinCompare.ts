// Compares target and recognized text by pinyin with tones (pinyin-pro is loaded only here).
// If characters differ but toneless pinyin is the same, it is either a tone slip or a homophone
// the recognizer picked; we can only suggest, not decide.
export type ToneHint = { target: string; heard: string; targetPy: string; heardPy: string; kind: 'tone' | 'homophone' };

export async function compareByPinyin(target: string, heard: string): Promise<{ matchPct: number; hints: ToneHint[] }> {
  const { pinyin } = await import('pinyin-pro');
  const han = (s: string) => [...s].filter(c => /\p{Script=Han}/u.test(c));
  const t = han(target), h = han(heard);
  const py = (chars: string[]) => pinyin(chars.join(''), { type: 'array', toneType: 'symbol' });
  const tp = py(t), hp = py(h);
  const strip = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

  // LCS on toneless syllables, then inspect aligned pairs
  const n = tp.length, m = hp.length;
  const dp = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i][j] = strip(tp[i]) === strip(hp[j]) ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const hints: ToneHint[] = [];
  let exact = 0, i = 0, j = 0;
  while (i < n && j < m) {
    if (strip(tp[i]) === strip(hp[j])) {
      if (tp[i] === hp[j]) {
        exact++;
        if (t[i] !== h[j]) hints.push({ target: t[i], heard: h[j], targetPy: tp[i], heardPy: hp[j], kind: 'homophone' });
      } else hints.push({ target: t[i], heard: h[j], targetPy: tp[i], heardPy: hp[j], kind: 'tone' });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) i++; else j++;
  }
  return { matchPct: Math.round((exact / Math.max(n, m, 1)) * 100), hints };
}
