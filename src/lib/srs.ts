// Spaced repetition: Leitner boxes, one card per word and direction (plus sentence cards).
// Why Leitner and not SM-2: fewer parameters, behaviour easy to explain and test, and with
// self-grading (remember / forgot) SM-2's ease factor adds little.
//
// Box -> interval in days. Correct: move up one box. Wrong: back to box 1, due again today.
// A word counts as "mastered" when BOTH directions reach MASTER_BOX (interval >= 8 days),
// i.e. it survived several spaced reviews in each direction.
export const INTERVALS = [0, 1, 2, 4, 8, 16, 32, 64];
export const MASTER_BOX = 4;

export type Dir = 'zh2vi' | 'vi2zh' | 'sentence';

export type Card = {
  id: string;        // `${itemId}|${dir}`
  wordId: string;    // word id, or sentence id for dir "sentence"
  dir: Dir;
  box: number;
  due: number;       // day number
  reps: number;
  lapses: number;
  introduced: number; // day number when first shown
  last?: number;     // ms of last review
};

export const cardId = (itemId: string, dir: Dir) => `${itemId}|${dir}`;

export function newCard(itemId: string, dir: Dir, today: number): Card {
  return { id: cardId(itemId, dir), wordId: itemId, dir, box: 0, due: today, reps: 0, lapses: 0, introduced: today };
}

export function grade(card: Card, correct: boolean, today: number, now = Date.now()): Card {
  if (!correct) return { ...card, box: 1, due: today, reps: card.reps + 1, lapses: card.lapses + 1, last: now };
  const box = Math.min(card.box + 1, INTERVALS.length - 1);
  return { ...card, box, due: today + INTERVALS[box], reps: card.reps + 1, last: now };
}

export function isMastered(cards: Card[]): boolean {
  const zh = cards.find(c => c.dir === 'zh2vi');
  const vi = cards.find(c => c.dir === 'vi2zh');
  return !!zh && !!vi && zh.box >= MASTER_BOX && vi.box >= MASTER_BOX;
}

export type DailyPlan = { due: Card[]; newWordIds: string[]; capped: boolean };

/**
 * Today's queue: all due cards (most overdue first, up to reviewCap), plus new words while
 * the backlog is under the cap. New words already introduced today count against newPerDay.
 */
export function planToday(opts: {
  cards: Card[]; today: number; newPerDay: number; reviewCap: number;
  candidates: string[]; // word ids in study order, not yet introduced
}): DailyPlan {
  const { cards, today, newPerDay, reviewCap, candidates } = opts;
  const due = cards.filter(c => c.dir !== 'sentence' && c.due <= today).sort((a, b) => a.due - b.due || a.box - b.box);
  const introducedToday = new Set(cards.filter(c => c.introduced === today && c.dir !== 'sentence').map(c => c.wordId)).size;
  const capped = due.length >= reviewCap;
  const room = capped ? 0 : Math.max(0, Math.min(newPerDay - introducedToday, Math.floor((reviewCap - due.length) / 2)));
  return { due: due.slice(0, reviewCap), newWordIds: candidates.slice(0, room), capped };
}
