// Vocabulary progress on top of the SRS cards and the event log.
import { db, notifyChange } from './storage';
import { logEvent } from './events';
import { grade, isMastered, newCard, planToday, type Card, type Dir } from './srs';
import { todayNum } from './day';
import { getSettings, updateSettings } from './settings';
import { loadIndex, studyOrder } from './words';

export async function allCards(): Promise<Card[]> {
  return (await db()).getAll('srs');
}

export function cardsByWord(cards: Card[]): Map<string, Card[]> {
  const m = new Map<string, Card[]>();
  for (const c of cards) if (c.dir !== 'sentence') m.set(c.wordId, [...(m.get(c.wordId) ?? []), c]);
  return m;
}

export function masteredIds(cards: Card[]): Set<string> {
  return new Set([...cardsByWord(cards)].filter(([, cs]) => isMastered(cs)).map(([id]) => id));
}

export type WordStatus = 'new' | 'learning' | 'mastered';
export function wordStatus(cards: Card[] | undefined): WordStatus {
  if (!cards?.length) return 'new';
  return isMastered(cards) ? 'mastered' : 'learning';
}

/** Today's plan: due cards + new word ids (not yet created as cards). */
export async function todayPlan() {
  const [cards, settings, idx] = await Promise.all([allCards(), getSettings(), loadIndex()]);
  const known = new Set(cards.map(c => c.wordId));
  const candidates = studyOrder(idx, settings.topicOrder).filter(id => !known.has(id));
  return planToday({ cards, today: todayNum(), newPerDay: settings.newPerDay, reviewCap: settings.reviewCap, candidates });
}

/** Creates both direction cards for new words (shown today). */
export async function introduce(wordIds: string[]): Promise<Card[]> {
  const today = todayNum();
  const cards = wordIds.flatMap(id => [newCard(id, 'zh2vi', today), newCard(id, 'vi2zh', today)]);
  const tx = (await db()).transaction('srs', 'readwrite');
  for (const c of cards) tx.store.put(c);
  await tx.done;
  return cards;
}

/** Grades one card, stores it and logs the practice event. Returns the updated card. */
export async function answer(card: Card, correct: boolean, durationSec: number): Promise<Card> {
  const updated = grade(card, correct, todayNum());
  await (await db()).put('srs', updated);
  const skill = card.dir === 'sentence' ? 'write' : 'vocab';
  await logEvent({
    skill,
    kind: card.dir === 'sentence' ? 'sentence-review' : card.reps === 0 ? 'new' : 'review',
    itemId: card.wordId,
    durationSec,
    countsAsPractice: true,
    metrics: { correct, direction: card.dir as Dir, box: updated.box },
  });
  notifyChange();
  return updated;
}

/** Moves a topic to the front of the study order (new words come from it first). */
export async function prioritiseTopic(topicId: string) {
  const s = await getSettings();
  await updateSettings({ topicOrder: [topicId, ...s.topicOrder.filter(t => t !== topicId)] });
}
