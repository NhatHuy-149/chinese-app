// Pinyin helpers for the data build (tone marks <-> tone numbers, joining syllables).
import { pinyin } from 'pinyin-pro';

const TONE_MARKS: Record<string, [string, number]> = {};
for (const [base, marks] of Object.entries({
  a: 'āáǎà', e: 'ēéěè', i: 'īíǐì', o: 'ōóǒò', u: 'ūúǔù', ü: 'ǖǘǚǜ',
})) [...marks].forEach((m, i) => { TONE_MARKS[m] = [base, i + 1]; });

/** "xiè" -> "xie4", "le" -> "le5", "lǜ" -> "lv4" */
export function syllableToNum(syl: string): string {
  let tone = 5;
  let out = '';
  for (const ch of syl.toLowerCase()) {
    const hit = TONE_MARKS[ch];
    if (hit) { out += hit[0]; tone = hit[1]; } else out += ch;
  }
  return out.replace(/ü/g, 'v') + tone;
}

/** Strips tones and separators: "Xièxie" -> "xiexie" */
export function toneless(p: string): string {
  return [...p.toLowerCase().replace(/u:|[üǖǘǚǜ]/g, 'v').normalize('NFD').replace(/[̀-ͯ]/g, '')]
    .filter(c => /[a-z]/.test(c)).join('');
}

/** Joins spaced syllables into word pinyin, adding an apostrophe before a/o/e syllables. */
export function joinSyllables(spaced: string): string {
  const syls = spaced.trim().replace(/u:/g, 'ü').split(/\s+/);
  return syls.map((s, i) => (i > 0 && /^[aoeāáǎàōóǒòēéěè]/i.test(s) ? "'" + s : s)).join('');
}

/** Numeric pinyin from pinyin-pro (citation tones, no sandhi), neutral tone as 5. */
export function libraryNum(hanzi: string): string[] {
  return pinyin(hanzi, { toneType: 'num', type: 'array', toneSandhi: false, nonZh: 'removed' })
    .map(s => s.replace(/0$/, '5').replace(/ü/g, 'v'));
}
