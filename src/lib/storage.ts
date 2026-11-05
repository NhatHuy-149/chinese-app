// IndexedDB access. Everything the learner produces lives here, on the device only.
// Opening the app with ?dev=1 uses a separate database for sample data, so it never mixes with real data.
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { PracticeEvent } from './events';
import type { Card } from './srs';
import type { SavedSentence } from './sentences';

interface AppDB extends DBSchema {
  events: { key: string; value: PracticeEvent; indexes: { ts: number } };
  srs: { key: string; value: Card; indexes: { wordId: string } };
  sentences: { key: string; value: SavedSentence };
  kv: { key: string; value: unknown };
}

export const IS_DEV_DB = typeof location !== 'undefined' && new URLSearchParams(location.search).has('dev');
const DB_NAME = IS_DEV_DB ? 'chinese-app-dev' : 'chinese-app';

let dbPromise: Promise<IDBPDatabase<AppDB>> | null = null;

export function db(): Promise<IDBPDatabase<AppDB>> {
  dbPromise ??= openDB<AppDB>(DB_NAME, 1, {
    upgrade(d) {
      d.createObjectStore('events', { keyPath: 'id' }).createIndex('ts', 'ts');
      d.createObjectStore('srs', { keyPath: 'id' }).createIndex('wordId', 'wordId');
      d.createObjectStore('sentences', { keyPath: 'id' });
      d.createObjectStore('kv');
    },
  });
  return dbPromise;
}

export async function kvGet<T>(key: string, fallback: T): Promise<T> {
  const v = await (await db()).get('kv', key);
  return v === undefined ? fallback : (v as T);
}

export async function kvSet(key: string, value: unknown): Promise<void> {
  await (await db()).put('kv', value, key);
}

/** Wipes every store (used by "delete all data" and by replacing data on import). */
export async function clearAll(): Promise<void> {
  const d = await db();
  const tx = d.transaction(['events', 'srs', 'sentences', 'kv'], 'readwrite');
  await Promise.all([
    tx.objectStore('events').clear(), tx.objectStore('srs').clear(),
    tx.objectStore('sentences').clear(), tx.objectStore('kv').clear(), tx.done,
  ]);
}

/** Simple change notification so screens can refresh after data changes. */
export const changes = new EventTarget();
export const notifyChange = () => changes.dispatchEvent(new Event('change'));
