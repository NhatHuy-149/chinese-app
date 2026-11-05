// Builds build/candidates.json: every legacy word plus the most frequent HSK words,
// with pinyin cross-checked against pinyin-pro and Han-Viet hints.
// No LLM here; later scripts classify, enrich and verify these candidates.
import { loadLegacy } from './lib/legacy.ts';
import { readJson, readText, writeJson } from './lib/io.ts';
import { joinSyllables, libraryNum, syllableToNum, toneless } from './lib/pinyin.ts';

/** How many non-legacy HSK words to send to the everyday filter (target keeps ~2500). */
const NEW_POOL_SIZE = 3400;
const NO_FREQUENCY = 1_000_000;

type HskForm = { t: string; i: { y: string; n: string }; m: string[]; c: string[] };
type HskEntry = { s: string; r: string; l: string[]; q: number; p: string[]; f: HskForm[] };

export type Candidate = {
  id: string;
  hanzi: string;
  pinyin: string;          // tone marks, syllables joined
  pinyinNum: string;       // e.g. "xie4xie5"
  origin: 'legacy' | 'hsk';
  inHsk: boolean;
  hskLevels: string[];
  freq: number | null;     // source frequency rank, lower = more common (build-time only)
  pos: string[];
  classifiers: string[];
  en: string[];            // CC-CEDICT glosses: LLM input only, never shipped
  otherReadings: string[]; // other pinyin readings of the same characters
  legacy?: { hanViet: string; vi: string; structure: string; contextMeanings: string[]; pinyinVariants: string[] };
  hanVietHint: string[];   // per character, from legacy words, then Unihan
  pinyinCheck: { library: string; matches: boolean };
};

const L = loadLegacy();
const hsk = readJson<HskEntry[]>('sources/raw/hsk/complete.min.json');
const hskBySimplified = new Map(hsk.map(e => [e.s, e]));

// --- Han-Viet hints per character -------------------------------------------
const charHanViet = new Map<string, Set<string>>();
const addHv = (h: string, hv: string) => {
  const chars = [...h];
  const syls = hv.trim().toLowerCase().split(/\s+/);
  if (!hv || hv === '—' || syls.length !== chars.length) return;
  chars.forEach((c, i) => {
    if (!charHanViet.has(c)) charHanViet.set(c, new Set());
    charHanViet.get(c)!.add(syls[i]);
  });
};
L.DATA.forEach(card => card.words.forEach(w => addHv(w.h, w.hv)));
Object.entries(L.PW).forEach(([h, v]) => addHv(h, v[1]));

const unihan = new Map<string, string[]>();
for (const line of readText('sources/raw/unihan/kVietnamese.txt').split('\n')) {
  const m = line.match(/^U\+([0-9A-F]+)\tkVietnamese\t(.+)$/);
  if (m) unihan.set(String.fromCodePoint(parseInt(m[1], 16)), m[2].trim().split(/\s+/));
}

function hanVietHint(simplified: string, traditional?: string): string[] {
  const trad = traditional ? [...traditional] : [];
  return [...simplified].map((c, i) => {
    const known = charHanViet.get(c);
    if (known) return [...known].join('/');
    const u = unihan.get(c) ?? (trad[i] ? unihan.get(trad[i]) : undefined);
    return u ? u.join('/') + '?' : '?'; // "?" marks an unconfirmed hint
  });
}

// --- helpers -----------------------------------------------------------------
// Built from the tone-mark field: the numeric field is malformed for some entries (e.g. "zhen1de").
const formNum = (f: HskForm, hanzi: string) =>
  toNum(hanzi, f.i.y) ?? f.i.y.trim().split(/\s+/).map(syllableToNum).join('');

const isProperForm = (f: HskForm) =>
  /^[A-ZĀÁǍÀĒÉĚÈŌÓǑÒ]/.test(f.i.y) || f.m.every(m => /^(surname|variant of|old variant)/i.test(m));

/** Prefers an exact tone match with the legacy pinyin, then a toneless match, then the first common-noun form. */
function pickForm(e: HskEntry, legacyPinyin?: string): HskForm {
  const common = e.f.filter(f => !isProperForm(f));
  const forms = common.length ? common : e.f;
  if (!legacyPinyin) return forms[0];
  const flat = (p: string) => p.toLowerCase().replace(/[\s'’]/g, '');
  return forms.find(f => flat(f.i.y) === flat(legacyPinyin))
    ?? forms.find(f => toneless(f.i.y) === toneless(legacyPinyin))
    ?? forms[0];
}

/**
 * Converts tone-mark pinyin (spaced or joined) to numbers, using pinyin-pro only to find
 * syllable boundaries. Returns null when the syllables cannot be aligned with the characters.
 */
function toNum(hanzi: string, p: string): string | null {
  const lib = libraryNum(hanzi).map(s => s.replace(/\d$/, ''));
  const clean = p.toLowerCase().replace(/u:/g, 'ü');
  const flat = [...clean].filter(c => /\p{L}/u.test(c));
  if (toneless(lib.join('')) !== toneless(clean)) return null;
  const chars = [...hanzi].filter(c => /\p{Script=Han}/u.test(c));
  let pos = 0;
  return lib.map((syl, i) => {
    const len = syl.replace(/v/g, 'ü').length;
    const piece = flat.slice(pos, pos + len).join('');
    pos += len;
    // 一/不 are often written with spoken sandhi tones; ids use citation tones.
    if (chars[i] === '一') return 'yi1';
    if (chars[i] === '不') return 'bu4';
    return syllableToNum(piece);
  }).join('');
}

type PinyinCheck = { library: string; status: 'match' | 'neutral-tone' | 'polyphone' | 'mismatch' };

/** Compares our numeric pinyin with pinyin-pro and classifies the difference. */
function check(hanzi: string, num: string, otherReadings: string[]): PinyinCheck {
  const library = libraryNum(hanzi).join('');
  if (library === num) return { library, status: 'match' };
  const noNeutral = (s: string) => s.replace(/[1-5]/g, d => (d === '5' ? '*' : d));
  const sameExceptNeutral = library.length === num.length &&
    [...library].every((c, i) => c === num[i] || (/\d/.test(c) && (c === '5' || num[i] === '5')));
  if (sameExceptNeutral) return { library, status: 'neutral-tone' };
  const libFlatReadings = otherReadings.map(r => r.split(/\s+/).map(syllableToNum).join(''));
  if (libFlatReadings.includes(library) || toneless(library.replace(/\d/g, '')) !== toneless(num.replace(/\d/g, '')))
    return { library, status: 'polyphone' };
  void noNeutral;
  return { library, status: 'mismatch' };
}

// --- legacy words (DATA first, then paragraph words) --------------------------
type Collected = { h: string; p: string; hv: string; m: string; st: string; meanings: Set<string>; pinyins: Set<string> };
const legacyWords = new Map<string, Collected>();
const collect = (h: string, p: string, hv: string, m: string, st: string) => {
  const seen = legacyWords.get(h);
  if (seen) { seen.meanings.add(m); seen.pinyins.add(p); return; }
  legacyWords.set(h, { h, p, hv, m, st, meanings: new Set([m]), pinyins: new Set([p]) });
};
L.DATA.forEach(card => card.words.forEach(w => collect(w.h, w.p, w.hv, w.m, w.st)));
Object.entries(L.PW).forEach(([h, [p, hv, m, st]]) => collect(h, p, hv, m, st));

const candidates: Candidate[] = [];
const usedIds = new Set<string>();
const uniqueId = (base: string) => {
  let id = base, n = 2;
  while (usedIds.has(id)) id = `${base}~${n++}`;
  usedIds.add(id);
  return id;
};

for (const w of legacyWords.values()) {
  const e = hskBySimplified.get(w.h);
  const form = e ? pickForm(e, w.p) : undefined;
  const num = toNum(w.h, w.p) ?? (form ? formNum(form, w.h) : libraryNum(w.h).join(''));
  const otherReadings = e ? e.f.filter(f => f !== form).map(f => f.i.y) : [];
  candidates.push({
    id: uniqueId(`${w.h}_${num}`),
    hanzi: w.h,
    pinyin: w.p,
    pinyinNum: num,
    origin: 'legacy',
    inHsk: !!e,
    hskLevels: e?.l ?? [],
    freq: e && e.q < NO_FREQUENCY ? e.q : null,
    pos: e?.p ?? [],
    classifiers: form?.c ?? [],
    en: form?.m ?? [],
    otherReadings,
    legacy: {
      hanViet: w.hv, vi: w.m, structure: w.st,
      contextMeanings: [...w.meanings].filter(m => m !== w.m),
      pinyinVariants: [...w.pinyins].filter(p => p !== w.p),
    },
    hanVietHint: hanVietHint(w.h, form?.t),
    pinyinCheck: check(w.h, num, otherReadings),
  });
}

// --- most frequent HSK words not already covered ------------------------------
const pool = hsk
  .filter(e => !legacyWords.has(e.s) && e.q < NO_FREQUENCY && /^\p{Script=Han}+$/u.test(e.s))
  .sort((a, b) => a.q - b.q)
  .slice(0, NEW_POOL_SIZE);

for (const e of pool) {
  const form = pickForm(e);
  const num = formNum(form, e.s);
  const otherReadings = e.f.filter(f => f !== form && !isProperForm(f)).map(f => f.i.y);
  candidates.push({
    id: uniqueId(`${e.s}_${num}`),
    hanzi: e.s,
    pinyin: joinSyllables(form.i.y),
    pinyinNum: num,
    origin: 'hsk',
    inHsk: true,
    hskLevels: e.l,
    freq: e.q,
    pos: e.p,
    classifiers: form.c,
    en: form.m,
    otherReadings,
    hanVietHint: hanVietHint(e.s, form.t),
    pinyinCheck: check(e.s, num, otherReadings),
  });
}

writeJson('build/candidates.json', candidates);

// --- report ------------------------------------------------------------------
const legacyCount = candidates.filter(c => c.origin === 'legacy').length;
const byStatus: Record<string, number> = {};
candidates.forEach(c => { byStatus[c.pinyinCheck.status] = (byStatus[c.pinyinCheck.status] ?? 0) + 1; });
console.log(`legacy words: ${legacyCount} (in HSK: ${candidates.filter(c => c.origin === 'legacy' && c.inHsk).length})`);
console.log(`new HSK candidates: ${candidates.length - legacyCount} (freq rank up to ${pool.at(-1)?.q})`);
console.log('pinyin check vs pinyin-pro:', byStatus);
console.log(`ids with suffix: ${candidates.filter(c => c.id.includes('~')).length}`);
