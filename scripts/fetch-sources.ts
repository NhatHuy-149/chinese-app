// Downloads third-party source data, pinned to exact versions, into sources/raw/.
// sources/raw/ is git-ignored; run `npm run data:fetch` to recreate it.
import { unzipSync, strFromU8 } from 'fflate';
import { writeText, exists, path } from './lib/io.ts';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const HSK_SHA = '7ac65bf1a6387d35f1ade478906172a19311c7f9'; // drkameleon/complete-hsk-vocabulary
const MMAH_SHA = 'bddc96d41bef78427ed0e034e9f7e31d71fd1b92'; // skishore/makemeahanzi
const UNIHAN_VERSION = '16.0.0';

const gh = (repo: string, sha: string, file: string) =>
  `https://raw.githubusercontent.com/${repo}/${sha}/${file}`;

const FILES: Array<[string, string]> = [
  ['sources/raw/hsk/complete.min.json', gh('drkameleon/complete-hsk-vocabulary', HSK_SHA, 'complete.min.json')],
  ['sources/raw/hsk/LICENSE', gh('drkameleon/complete-hsk-vocabulary', HSK_SHA, 'LICENSE')],
  ['sources/raw/mmah/graphics.txt', gh('skishore/makemeahanzi', MMAH_SHA, 'graphics.txt')],
  ['sources/raw/mmah/dictionary.txt', gh('skishore/makemeahanzi', MMAH_SHA, 'dictionary.txt')],
  ['sources/raw/mmah/COPYING', gh('skishore/makemeahanzi', MMAH_SHA, 'COPYING')],
];

async function download(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return new Uint8Array(await res.arrayBuffer());
}

function save(rel: string, bytes: Uint8Array): void {
  mkdirSync(dirname(path(rel)), { recursive: true });
  writeFileSync(path(rel), bytes);
}

for (const [rel, url] of FILES) {
  if (exists(rel)) { console.log('skip', rel); continue; }
  save(rel, await download(url));
  console.log('ok  ', rel);
}

// Unihan: we only need kVietnamese (Han-Viet readings per character).
const unihanOut = 'sources/raw/unihan/kVietnamese.txt';
if (!exists(unihanOut)) {
  const zip = unzipSync(await download(`https://www.unicode.org/Public/${UNIHAN_VERSION}/ucd/Unihan.zip`));
  const readings = strFromU8(zip['Unihan_Readings.txt']);
  const lines = readings.split('\n').filter(l => l.includes('\tkVietnamese\t'));
  writeText(unihanOut, `# Extracted from Unihan ${UNIHAN_VERSION} (Unicode License v3)\n` + lines.join('\n') + '\n');
  console.log('ok  ', unihanOut, lines.length, 'chars');
} else console.log('skip', unihanOut);
