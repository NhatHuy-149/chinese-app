// Extracts the hand-written legacy data to plain JSON (content unchanged).
// Stroke data is not copied here; build-strokes.ts writes it per character.
import { loadLegacy } from './lib/legacy.ts';
import { writeJson } from './lib/io.ts';

const L = loadLegacy();
writeJson('legacy/data/dialogues.json', L.DATA);
writeJson('legacy/data/paragraphs.json', L.PARAGRAPHS);
writeJson('legacy/data/paragraph-words.json', L.PW);
writeJson('legacy/data/write-data.json', L.WRITE_DATA);

console.log(`dialogues: ${L.DATA.length} cards`);
console.log(`paragraphs: ${L.PARAGRAPHS.length}`);
console.log(`paragraph words: ${Object.keys(L.PW).length}`);
console.log(`write data: ${Object.keys(L.WRITE_DATA.chars).length} chars`);
