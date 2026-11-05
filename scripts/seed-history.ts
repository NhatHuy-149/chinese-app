// Generates ~90 days of FAKE practice history for checking the Progress screen by eye.
// Output: build/seed-history.json, a backup marked devData. It can only be imported when the app
// is opened with ?dev=1 (separate database); the real database refuses it.
import { readJson, writeJson } from './lib/io.ts';

const DAYS = 90;
let seed = 42;
const rand = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
const pick = <T,>(a: T[]) => a[Math.floor(rand() * a.length)];

type Topic = { sets: string[][] };
const wordIds = readJson<{ topics: Topic[] }>('public/data/topics.json').topics.flatMap(t => t.sets.flat());
const TAGS = ['lượng từ', 'trật tự từ', '了/过', 'từ nối', 'dùng từ', 'thanh điệu'];

const events: unknown[] = [];
let id = 0;
const boxes = new Map<string, { zh2vi: number; vi2zh: number }>();
const ev = (ts: number, p: Record<string, unknown>) => events.push({ v: 1, id: `seed-${id++}`, ts, countsAsPractice: true, dev: true, ...p });

const start = new Date();
start.setHours(12, 0, 0, 0);
start.setDate(start.getDate() - DAYS);
let introduced = 0;

for (let d = 0; d < DAYS; d++) {
  const progress = d / DAYS; // 0 → 1, quality improves over time
  if (rand() < 0.15 || (d > 40 && d < 44)) continue; // rest days and one short break
  const base = start.getTime() + d * 86_400_000 + Math.floor(rand() * 8) * 3_600_000;
  let t = base;
  const step = (sec: number) => (t += sec * 1000);

  // vocab: new words + reviews
  const newToday = Math.min(15, wordIds.length - introduced);
  const today = wordIds.slice(introduced, introduced + newToday);
  introduced += newToday;
  const reviewPool = wordIds.slice(0, introduced);
  for (let i = 0; i < 25 + Math.floor(rand() * 20); i++) {
    const w = i < today.length * 2 ? today[i % today.length] : pick(reviewPool);
    const dir = i % 2 ? 'vi2zh' : 'zh2vi';
    const b = boxes.get(w) ?? { zh2vi: 0, vi2zh: 0 };
    const correct = rand() < 0.6 + 0.3 * progress;
    b[dir] = correct ? Math.min(7, b[dir] + 1) : 1;
    boxes.set(w, b);
    ev(step(8 + rand() * 12), { skill: 'vocab', kind: b[dir] <= 1 && correct ? 'new' : 'review', itemId: w, durationSec: Math.round(8 + rand() * 12), metrics: { correct, direction: dir, box: b[dir] } });
  }
  // write
  for (let i = 0; i < 2 + Math.floor(rand() * 4); i++) {
    const corrections = Math.max(0, Math.round((1 - progress) * 3 * rand()));
    ev(step(90), { skill: 'write', kind: 'check', durationSec: 60 + Math.round(rand() * 120),
      metrics: { firstTryCorrect: corrections === 0, corrections, retypeOk: rand() < 0.8, retypeDone: true },
      errorTags: corrections ? Array.from({ length: corrections }, () => (rand() < 0.5 - progress * 0.3 ? 'lượng từ' : pick(TAGS))) : [] });
  }
  // speak
  for (let i = 0; i < 3 + Math.floor(rand() * 8); i++) {
    const speakSec = 4 + Math.round(rand() * 8);
    ev(step(30), { skill: 'speak', kind: 'shadow', durationSec: speakSec + 15, metrics: { mode: 'shadow', matchPct: Math.round(50 + 40 * progress + rand() * 10), speakSec } });
  }
  // listen
  if (rand() < 0.7) for (let i = 0; i < 1 + Math.floor(rand() * 2); i++) {
    ev(step(240), { skill: 'listen', kind: 'gist', durationSec: 180 + Math.round(rand() * 120),
      metrics: { score: Math.round(40 + 45 * progress + rand() * 15), caught: 2, total: 3, replays: 1, level: 'A1', source: 'offline', selfGraded: false } });
  }
}

writeJson('build/seed-history.json', {
  app: 'chinese-app', version: 1, exportedAt: new Date().toISOString(), devData: true,
  events, srs: [], sentences: [], kv: {},
});
console.log(`seed: ${events.length} events over ${DAYS} days → build/seed-history.json (import with the app opened at ?dev=1)`);
