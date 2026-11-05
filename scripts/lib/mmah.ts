// Make Me a Hanzi readers (dictionary.txt: radical/decomposition, graphics.txt: strokes).
import { readText } from './io.ts';

export type MmahDict = { character: string; radical?: string; decomposition?: string; etymology?: { hint?: string } };
export type MmahGraphic = { character: string; strokes: string[]; medians: number[][][] };

function readJsonLines<T extends { character: string }>(rel: string, wanted?: Set<string>): Map<string, T> {
  const map = new Map<string, T>();
  for (const line of readText(rel).split('\n')) {
    if (!line.trim()) continue;
    // cheap pre-filter on the character before parsing the (large) line
    const m = line.match(/^\{"character":"(.+?)"/);
    if (wanted && m && !wanted.has(m[1])) continue;
    const obj = JSON.parse(line) as T;
    map.set(obj.character, obj);
  }
  return map;
}

export const loadMmahDictionary = (wanted?: Set<string>) =>
  readJsonLines<MmahDict>('sources/raw/mmah/dictionary.txt', wanted);
export const loadMmahGraphics = (wanted?: Set<string>) =>
  readJsonLines<MmahGraphic>('sources/raw/mmah/graphics.txt', wanted);
