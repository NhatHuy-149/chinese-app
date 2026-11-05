// Loads the data constants embedded in legacy/index.html without running the app.
import vm from 'node:vm';
import { readText } from './io.ts';

export type LegacyWord = { h: string; p: string; hv: string; m: string; st: string };
export type LegacyCard = {
  section?: string; time: string; mark: string;
  hanzi: string; pinyin: string; viet: string; meaning: string;
  words: LegacyWord[];
};
export type ParagraphRow = { h: string; p: string; m: string; w: string[] };
export type Paragraph = { topic: string; zh: string; vi: string; rows: ParagraphRow[] };
/** PW value: [pinyin, hanViet, meaning, structure] */
export type ParagraphWords = Record<string, [string, string, string, string]>;
export type StrokeData = Record<string, { strokes: string[]; medians: number[][][]; radStrokes?: number[] }>;
export type WriteData = {
  chars: Record<string, [string, number, string]>; // radical, strokes, pinyin
  rads: Record<string, [string, string, string, number]>;
  meanings: Record<string, string>;
  notes: Record<string, string>;
};

export type Legacy = {
  DATA: LegacyCard[]; PARAGRAPHS: Paragraph[]; PW: ParagraphWords;
  WRITE_DATA: WriteData; STROKE_DATA: StrokeData;
};

export function loadLegacy(): Legacy {
  const lines = readText('legacy/index.html').split(/\r?\n/);
  const start = lines.findIndex(l => l.startsWith('const DATA = ['));
  const end = lines.findIndex(l => l.startsWith('const SPEECH_OK'));
  if (start < 0 || end < 0) throw new Error('DATA block not found in legacy/index.html');
  const single = (name: string) => {
    const line = lines.find(l => l.startsWith(`const ${name} =`));
    if (!line) throw new Error(`${name} not found`);
    return line.replace(`const ${name}`, name);
  };
  const code = [
    lines.slice(start, end).join('\n').replace('const DATA', 'DATA'),
    ...['PARAGRAPHS', 'PW', 'WRITE_DATA', 'STROKE_DATA'].map(single),
  ].join(';\n');
  const ctx: Record<string, unknown> = {};
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx as unknown as Legacy;
}
