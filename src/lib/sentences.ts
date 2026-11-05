// Sentences the learner saved after a correction; reviewed with the same SRS (dir "sentence").
import { db, notifyChange } from './storage';
import { newCard } from './srs';
import { todayNum } from './day';

export type SavedSentence = {
  id: string;
  hanzi: string;
  pinyin: string;
  meaning: string;
  input?: string;          // what the learner originally wrote
  corrections?: Array<{ original: string; fixed: string; reason: string }>;
  note?: string;
  ts: number;
  source: 'write' | 'speak' | 'legacy';
};

export async function allSentences(): Promise<SavedSentence[]> {
  return (await db()).getAll('sentences');
}

export async function saveSentence(s: Omit<SavedSentence, 'id' | 'ts'> & { ts?: number }): Promise<SavedSentence | null> {
  const d = await db();
  const existing = (await d.getAll('sentences')).find(x => x.hanzi === s.hanzi);
  if (existing) return null;
  const rec: SavedSentence = { id: crypto.randomUUID(), ts: Date.now(), ...s };
  const tx = d.transaction(['sentences', 'srs'], 'readwrite');
  await tx.objectStore('sentences').put(rec);
  await tx.objectStore('srs').put(newCard(rec.id, 'sentence', todayNum() + 1));
  await tx.done;
  notifyChange();
  return rec;
}

/** Compares two Chinese strings ignoring punctuation and spaces. */
export const normalizeZh = (s: string) => s.replace(/[\s，。！？、,.!?…：:；;“”"'‘’（）()《》\-—]/g, '');
