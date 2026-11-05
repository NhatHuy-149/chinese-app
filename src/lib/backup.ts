// Export / import of all learner data (including the event log), CSV day summary,
// and one-time import from the old single-file app.
import { clearAll, db, IS_DEV_DB, notifyChange } from './storage';
import { logEvents, type PracticeEvent } from './events';
import { dayKey, todayNum } from './day';
import { totalsFor } from './stats';
import { newCard, type Card } from './srs';
import { loadAllWords } from './words';
import type { SavedSentence } from './sentences';

export type Backup = {
  app: 'chinese-app'; version: 1; exportedAt: string; devData: boolean;
  events: PracticeEvent[]; srs: Card[]; sentences: SavedSentence[]; kv: Record<string, unknown>;
};

export async function exportBackup(): Promise<Backup> {
  const d = await db();
  const kvKeys = await d.getAllKeys('kv');
  const kv: Record<string, unknown> = {};
  for (const k of kvKeys) kv[String(k)] = await d.get('kv', k);
  return {
    app: 'chinese-app', version: 1, exportedAt: new Date().toISOString(), devData: IS_DEV_DB,
    events: await d.getAll('events'), srs: await d.getAll('srs'), sentences: await d.getAll('sentences'), kv,
  };
}

/** Replaces all data with a backup. Sample (dev) data is refused in the real database. */
export async function importBackup(b: Backup): Promise<string> {
  if (b.app !== 'chinese-app' || !Array.isArray(b.events)) throw new Error('File không phải bản sao lưu của app này.');
  if (!IS_DEV_DB && (b.devData || b.events.some(e => e.dev))) throw new Error('File này chứa dữ liệu mẫu, không nhập vào dữ liệu thật.');
  await clearAll();
  const d = await db();
  const tx = d.transaction(['events', 'srs', 'sentences', 'kv'], 'readwrite');
  for (const e of b.events) tx.objectStore('events').put(e);
  for (const c of b.srs) tx.objectStore('srs').put(c);
  for (const s of b.sentences) tx.objectStore('sentences').put(s);
  for (const [k, v] of Object.entries(b.kv ?? {})) tx.objectStore('kv').put(v, k);
  await tx.done;
  notifyChange();
  return `Đã nhập ${b.events.length} sự kiện, ${b.srs.length} thẻ, ${b.sentences.length} câu.`;
}

export async function dailyCsv(): Promise<string> {
  const events = await (await db()).getAll('events');
  const byDay = new Map<string, PracticeEvent[]>();
  for (const e of events) byDay.set(dayKey(e.ts), [...(byDay.get(dayKey(e.ts)) ?? []), e]);
  const rows = [['ngay', 'on_tu', 'cau_viet', 'cau_noi', 'giay_noi', 'doan_nghe', 'phut_luyen']];
  for (const [k, es] of [...byDay].sort()) {
    const t = totalsFor(es);
    rows.push([k, t.vocab, t.write, t.speak, t.speakSec, t.listen, t.minutes.toFixed(1)].map(String));
  }
  return rows.map(r => r.join(',')).join('\n') + '\n';
}

export function download(name: string, content: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// --- old app ------------------------------------------------------------------------
type LegacyExport = { source: 'legacy-app'; data: Record<string, unknown> };
type LegacySentence = { hanzi: string; pinyin: string; meaning: string; input?: string; corrections?: SavedSentence['corrections']; note?: string; ts?: number };

/**
 * Imports the file made by the "Xuất dữ liệu cũ" button of legacy/index.html (or the old
 * sentence backup array). Known words start as mastered-level cards, due again within ~3 weeks
 * so they get checked; this is logged as kind "import" and never counts as practice.
 */
export async function importLegacy(raw: unknown): Promise<string> {
  const data: Record<string, unknown> = Array.isArray(raw)
    ? { hztMySentences: raw }
    : (raw as LegacyExport)?.source === 'legacy-app' ? (raw as LegacyExport).data : (() => { throw new Error('File không phải dữ liệu xuất từ app cũ.'); })();

  const words = await loadAllWords();
  const byHanzi = new Map<string, string>();
  for (const w of words.values()) if (!byHanzi.has(w.hanzi) || w.source === 'manual') byHanzi.set(w.hanzi, w.id);

  const d = await db();
  const existing = new Set((await d.getAll('srs')).map(c => c.wordId));
  const today = todayNum();
  const mastered = (Array.isArray(data.hztMasteredWords) ? data.hztMasteredWords : []) as string[];
  const ids = [...new Set(mastered.map(h => byHanzi.get(h)).filter((id): id is string => !!id && !existing.has(id)))];

  const tx = d.transaction(['srs', 'sentences', 'kv'], 'readwrite');
  ids.forEach((id, i) => {
    const due = today + 1 + (i % 21); // spread the check-up reviews over three weeks
    for (const dir of ['zh2vi', 'vi2zh'] as const) tx.objectStore('srs').put({ ...newCard(id, dir, today), box: 4, due, introduced: today });
  });
  const sentences = (Array.isArray(data.hztMySentences) ? data.hztMySentences : []) as LegacySentence[];
  const have = new Set((await d.getAll('sentences')).map(s => s.hanzi));
  let nSent = 0;
  for (const s of sentences) {
    if (!s?.hanzi || !s.pinyin || !s.meaning || have.has(s.hanzi)) continue;
    const rec: SavedSentence = { id: crypto.randomUUID(), hanzi: s.hanzi, pinyin: s.pinyin, meaning: s.meaning, input: s.input, corrections: s.corrections, note: s.note, ts: s.ts ?? Date.now(), source: 'legacy' };
    tx.objectStore('sentences').put(rec);
    tx.objectStore('srs').put(newCard(rec.id, 'sentence', today + 1 + (nSent % 14)));
    nSent++;
  }
  // keep the old app's personal notes in the backup (not shown in the new UI)
  tx.objectStore('kv').put({ hztHighlights: data.hztHighlights ?? [], hztWritten: data.hztWritten ?? [], importedAt: Date.now() }, 'legacyExtras');
  await tx.done;

  await logEvents(ids.map(id => ({ skill: 'vocab' as const, kind: 'import', itemId: id, countsAsPractice: false, metrics: { box: 4 } })));
  notifyChange();
  const notFound = mastered.length - ids.length - mastered.filter(h => existing.has(byHanzi.get(h) ?? '')).length;
  return `Đã nhập ${ids.length} từ đã thuộc và ${nSent} câu đã lưu.${notFound > 0 ? ` ${notFound} từ cũ không có trong danh sách mới.` : ''}`;
}

