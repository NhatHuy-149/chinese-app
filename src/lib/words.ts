// Loads static vocabulary data from public/data (fetched per topic, cached in memory).
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
  structure?: string;
  example?: { zh: string; py: string; vi: string };
  source: 'manual' | 'ai';
  aiFields?: Array<'vi' | 'hanViet' | 'example'>;
  needsReview?: true;
};

export type Topic = { id: string; vi: string; count: number; sets: string[][] };
export type TopicIndex = { version: number; total: number; topics: Topic[] };

let index: Promise<TopicIndex> | null = null;
const topicCache = new Map<string, Promise<Word[]>>();
let all: Promise<Map<string, Word>> | null = null;

const getJson = async <T,>(url: string): Promise<T> => {
  const r = await fetch(url);
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return r.json() as Promise<T>;
};

export const loadIndex = () => (index ??= getJson<TopicIndex>('/data/topics.json'));

export function loadTopic(id: string): Promise<Word[]> {
  if (!topicCache.has(id)) topicCache.set(id, getJson<Word[]>(`/data/words/${id}.json`));
  return topicCache.get(id)!;
}

/** Every word, keyed by id (loads all topic files; used by search, review and listening). */
export function loadAllWords(): Promise<Map<string, Word>> {
  all ??= loadIndex().then(async idx => {
    const lists = await Promise.all(idx.topics.map(t => loadTopic(t.id)));
    return new Map(lists.flat().map(w => [w.id, w]));
  });
  return all;
}

/** Word ids in study order: topics in the given order, then set order inside each topic. */
export function studyOrder(idx: TopicIndex, topicOrder: string[]): string[] {
  const byId = new Map(idx.topics.map(t => [t.id, t]));
  const ordered = [...topicOrder.filter(id => byId.has(id)), ...idx.topics.map(t => t.id).filter(id => !topicOrder.includes(id))];
  return ordered.flatMap(id => byId.get(id)!.sets.flat());
}

export const strokeUrl = (c: string) => `/data/strokes/${c.codePointAt(0)!.toString(16)}.json`;
