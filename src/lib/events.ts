// Practice event log: append-only. Every statistic in the app is computed from these events.
// Corrections never edit an event: "this AI result is wrong" is a new event of kind "flag"
// pointing at the original (see STATS.md).
import { db, notifyChange } from './storage';

export type Skill = 'vocab' | 'write' | 'speak' | 'listen';

export type PracticeEvent = {
  v: 1;
  id: string;
  ts: number;                  // ms; displayed day uses the device time zone and the 04:00 cut-off
  skill: Skill;
  kind: string;                // review, new, check, sentence-review, shadow, free, gist, import, flag
  itemId?: string;             // word id, sentence id, passage id, or (for flags) the flagged event id
  durationSec?: number;
  countsAsPractice: boolean;   // false for import and flag events
  metrics: Record<string, number | string | boolean>;
  errorTags?: string[];        // only values from ERROR_TAGS
  dev?: true;                  // sample data (never accepted into the real database)
};

/** Fixed list so statistics stay comparable; the LLM may only choose from it. */
export const ERROR_TAGS = [
  'lượng từ', 'trật tự từ', '了/过', 'từ nối', 'dùng từ', 'thanh điệu', 'số và ngày tháng', 'khác',
] as const;
export type ErrorTag = (typeof ERROR_TAGS)[number];

const newId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

export type NewEvent = Omit<PracticeEvent, 'v' | 'id' | 'ts'> & { ts?: number };

export async function logEvent(e: NewEvent): Promise<PracticeEvent> {
  const event: PracticeEvent = { v: 1, id: newId(), ts: e.ts ?? Date.now(), ...e } as PracticeEvent;
  await (await db()).add('events', event);
  notifyChange();
  return event;
}

export async function logEvents(list: NewEvent[]): Promise<void> {
  const d = await db();
  const tx = d.transaction('events', 'readwrite');
  for (const e of list) tx.store.add({ v: 1, id: newId(), ts: e.ts ?? Date.now(), ...e } as PracticeEvent);
  await tx.done;
  notifyChange();
}

export async function allEvents(): Promise<PracticeEvent[]> {
  return (await db()).getAllFromIndex('events', 'ts');
}

/** Learner reports that an AI result (or AI-made data) is wrong. */
export function flagWrong(target: PracticeEvent | { skill: Skill; itemId: string }, note = '') {
  return logEvent({
    skill: target.skill,
    kind: 'flag',
    itemId: 'id' in target ? target.id : target.itemId,
    countsAsPractice: false,
    metrics: { note, targetType: 'id' in target ? 'event' : 'data' },
  });
}
