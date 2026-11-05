// Step 5 (no LLM): writes the app data.
//   public/data/topics.json          topic list with study sets (10–15 word ids each)
//   public/data/words/<topic>.json   words of one topic
//   public/data/strokes/<hex>.json   Hanzi Writer stroke data, one file per character
//   docs/needs-review.md, docs/review-sample.md
import { exists, readJson, writeJson, writeText } from './lib/io.ts';
import { loadLegacy } from './lib/legacy.ts';
import { loadMmahDictionary, loadMmahGraphics } from './lib/mmah.ts';
import { TOPICS } from './lib/topics.ts';
import type { Verified } from './llm-verify.ts';
import { MOCK } from './lib/llm.ts';

// Mock runs (LLM_MOCK=1) never touch the real app data.
const OUT = MOCK ? 'build/mock-public' : 'public';
const DOCS = MOCK ? 'build/mock-docs' : 'docs';

const SET_MAX = 15;

/** Shape of one word in public/data/words/*.json (read by the app). */
export type Word = {
  id: string;
  hanzi: string;
  pinyin: string;
  hanViet?: string;
  vi: string;
  topic: string;
  freqRank: number;
  pos?: string[];
  classifiers?: string[];
  phrase?: true;
  chars: Array<{ c: string; radical?: string; radicalVi?: string; strokes?: number; parts?: string }>;
  structure?: string;      // hand-written explanation (legacy only, may contain <b>)
  example?: { zh: string; py: string; vi: string };
  source: 'manual' | 'ai';
  aiFields?: Array<'vi' | 'hanViet' | 'example'>;
  needsReview?: true;
};

const words = readJson<Verified[]>('build/verified.json');
const L = loadLegacy();
const allChars = new Set(words.flatMap(w => [...w.hanzi].filter(c => /\p{Script=Han}/u.test(c))));
const dict = loadMmahDictionary(allChars);
const graphics = loadMmahGraphics(allChars);

// --- per-character info --------------------------------------------------------
const radicalVi = (r?: string) => (r && L.WRITE_DATA.rads[r] ? L.WRITE_DATA.rads[r][1] : undefined);
function charInfo(c: string): Word['chars'][number] {
  const legacy = L.WRITE_DATA.chars[c];
  const d = dict.get(c);
  const radical = legacy?.[0] ?? d?.radical;
  const strokes = legacy?.[1] ?? L.STROKE_DATA[c]?.strokes.length ?? graphics.get(c)?.strokes.length;
  const parts = d?.decomposition && !d.decomposition.includes('？') ? d.decomposition : undefined;
  return { c, radical, radicalVi: radicalVi(radical), strokes, parts };
}

// --- words ---------------------------------------------------------------------
const toWord = (w: Verified): Word => {
  const aiFields = (['vi', 'hanViet', 'example'] as const).filter(f => w.fieldSource[f] === 'ai');
  return {
    id: w.id,
    hanzi: w.hanzi,
    pinyin: w.pinyin,
    ...(w.hanViet ? { hanViet: w.hanViet } : {}),
    vi: w.vi,
    topic: w.topic,
    freqRank: w.rank,
    ...(w.pos.length ? { pos: w.pos } : {}),
    ...(w.classifiers.length ? { classifiers: w.classifiers } : {}),
    ...(!w.inHsk && [...w.hanzi].length > 1 ? { phrase: true as const } : {}),
    chars: [...w.hanzi].filter(c => /\p{Script=Han}/u.test(c)).map(charInfo),
    ...(w.structure ? { structure: w.structure } : {}),
    ...(w.example ? { example: w.example } : {}),
    source: w.origin === 'legacy' ? 'manual' : 'ai',
    ...(aiFields.length ? { aiFields: [...aiFields] } : {}),
    ...(w.needsReview ? { needsReview: true as const } : {}),
  };
};

/** Splits n items into the fewest sets of at most SET_MAX, sized as evenly as possible. */
function splitSets<T>(items: T[]): T[][] {
  const k = Math.max(1, Math.ceil(items.length / SET_MAX));
  const base = Math.floor(items.length / k), extra = items.length % k;
  const out: T[][] = [];
  let pos = 0;
  for (let i = 0; i < k; i++) { const n = base + (i < extra ? 1 : 0); out.push(items.slice(pos, pos + n)); pos += n; }
  return out;
}

const topics = TOPICS.map(t => {
  const list = words.filter(w => w.topic === t.id)
    // legacy words first (already studied), then by frequency
    .sort((a, b) => Number(b.origin === 'legacy') - Number(a.origin === 'legacy') || a.rank - b.rank)
    .map(toWord);
  writeJson(`${OUT}/data/words/${t.id}.json`, list, true);
  return { id: t.id, vi: t.vi, count: list.length, sets: splitSets(list.map(w => w.id)) };
}).filter(t => t.count > 0);
writeJson(`${OUT}/data/topics.json`, { version: 1, total: words.length, topics });

// --- strokes -------------------------------------------------------------------
let fromLegacy = 0, fromMmah = 0;
const noStrokes: string[] = [];
for (const c of allChars) {
  const hex = c.codePointAt(0)!.toString(16);
  const legacy = L.STROKE_DATA[c];
  const g = graphics.get(c);
  if (legacy) { writeJson(`${OUT}/data/strokes/${hex}.json`, legacy, true); fromLegacy++; }
  else if (g) { writeJson(`${OUT}/data/strokes/${hex}.json`, { strokes: g.strokes, medians: g.medians }, true); fromMmah++; }
  else noStrokes.push(c);
}

// --- hand-written sentences and paragraphs (shadowing + offline listening) ----------
const clean = (s: string) => s.replace(/<br\s*\/?>/gi, ' ').trim();
const sentenceList = [
  ...L.DATA.filter(c => c.section !== 'sing-1').map(c => ({ zh: clean(c.hanzi), py: clean(c.pinyin), vi: clean(c.meaning) })),
  ...L.PARAGRAPHS.flatMap(p => p.rows.map(r => ({ zh: r.h, py: r.p, vi: r.m }))),
].filter(s => { const n = [...s.zh].length; return n >= 4 && n <= 30 && s.py && s.vi; });
const seen = new Set<string>();
writeJson(`${OUT}/data/sentences.json`, sentenceList.filter(s => !seen.has(s.zh) && seen.add(s.zh)), true);

// key points for offline listening are written by hand in data/manual/paragraph-keypoints.json
const keyPoints = exists('data/manual/paragraph-keypoints.json') ? readJson<Record<string, string[]>>('data/manual/paragraph-keypoints.json') : {};
writeJson(`${OUT}/data/paragraphs.json`, L.PARAGRAPHS.map((p, i) => ({
  id: `p${i + 1}`, topic: p.topic, title: p.vi,
  sentences: p.rows.map(r => ({ zh: r.h, py: r.p, vi: r.m })),
  keyPoints: keyPoints[`p${i + 1}`] ?? [],
})), true);

// --- review documents ------------------------------------------------------------
const fmt = (w: Verified) =>
  `| ${w.hanzi} | ${w.pinyin} | ${w.hanViet || ''} | ${w.vi} | ${w.example ? `${w.example.zh}<br>${w.example.py}<br>${w.example.vi}` : ''} | ${w.origin === 'legacy' ? 'cũ' : 'AI'} | ${w.reviewNotes.join('<br>')} |`;
const header = ['| Chữ Hán | Pinyin | Hán Việt | Nghĩa | Ví dụ | Nguồn | Ghi chú kiểm tra |', '|---|---|---|---|---|---|---|'];

const flagged = words.filter(w => w.needsReview);
writeText(`${DOCS}/needs-review.md`, [
  '# Từ cần xem lại', '', `Sinh bởi scripts/build-words.ts. ${flagged.length} mục bị đánh dấu nghi ngờ.`, '',
  ...header, ...flagged.map(fmt), '',
].join('\n'));

// deterministic "random" sample so the file is reproducible
let seed = 20261105;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const aiWords = words.filter(w => w.origin === 'hsk');
const sample = [...aiWords].sort(() => rand() - 0.5).slice(0, 40);
writeText(`${DOCS}/review-sample.md`, [
  '# Mẫu ngẫu nhiên 40 từ mới (do AI tạo)', '',
  'Hãy đọc và đánh dấu chỗ sai. Sinh lại bằng `npm run data:words`.', '',
  ...header, ...sample.map(fmt), '',
].join('\n'));

console.log(`topics: ${topics.length}, words: ${words.length}, sets: ${topics.reduce((a, t) => a + t.sets.length, 0)}`);
console.log(`strokes: ${fromLegacy} legacy + ${fromMmah} Make Me a Hanzi; missing: ${noStrokes.join('') || 'none'}`);
console.log(`needsReview: ${flagged.length}`);
