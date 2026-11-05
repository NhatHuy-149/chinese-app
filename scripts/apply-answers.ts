// Turns hand-written (or Claude Code session) answers into normal LLM cache entries.
// Usage: node scripts/apply-answers.ts <step>
// Reads data/llm-pending/<step>/<key>.json and data/llm-answers/<step>/<key>.tsv,
// validates every line, writes data/llm/<step>/<key>.json and removes the pending file.
//
// TSV formats (one line per item, same order as the pending ids, first column = hanzi):
//   classify: hanzi \t y|n \t topicId
//   enrich:   hanzi \t vi \t hanViet \t example zh \t example pinyin \t example vi
//   verify:   hanzi \t ok|issue text (Vietnamese)
import { readdirSync, rmSync } from 'node:fs';
import { exists, path, readJson, readText, writeJson } from './lib/io.ts';
import { TOPIC_IDS } from './lib/topics.ts';

const step = process.argv[2];
if (!['classify', 'enrich', 'verify'].includes(step)) throw new Error('step must be classify | enrich | verify');

const hanziOf = (id: string) => id.slice(0, id.lastIndexOf('_'));
const pendingDir = `data/llm-pending/${step}`;
if (!exists(pendingDir)) { console.log('nothing pending'); process.exit(0); }

let applied = 0;
for (const f of readdirSync(path(pendingDir)).filter(f => f.endsWith('.json'))) {
  const key = f.replace(/\.json$/, '');
  const answerFile = `data/llm-answers/${step}/${key}.tsv`;
  if (!exists(answerFile)) continue;
  const { ids } = readJson<{ ids: string[] }>(`${pendingDir}/${f}`);
  const lines = readText(answerFile).split(/\r?\n/).filter(l => l.trim());
  if (lines.length !== ids.length) throw new Error(`${key}: ${lines.length} lines for ${ids.length} items`);

  const items = lines.map((line, i) => {
    const cols = line.split('\t').map(s => s.trim());
    const id = ids[i];
    if (cols[0] !== hanziOf(id)) throw new Error(`${key} line ${i + 1}: expected ${hanziOf(id)}, got ${cols[0]}`);
    if (step === 'classify') {
      const [, yn, topic] = cols;
      if (!['y', 'n'].includes(yn) || !(TOPIC_IDS as readonly string[]).includes(topic))
        throw new Error(`${key} line ${i + 1}: bad classify "${line}"`);
      return { id, everyday: yn === 'y', topic };
    }
    if (step === 'enrich') {
      const [, vi, hanViet, zh, py, exVi] = cols;
      if (!vi || !zh || !py || !exVi || cols.length !== 6) throw new Error(`${key} line ${i + 1}: bad enrich "${line}"`);
      return { id, vi, hanViet: hanViet === '-' ? '' : hanViet, example: { zh, py, vi: exVi } };
    }
    const verdict = cols[1] ?? '';
    return verdict === 'ok' ? { id, ok: true, issues: [] } : { id, ok: false, issues: [verdict] };
  });

  writeJson(`data/llm/${step}/${key}.json`, { model: 'claude-code-session', createdAt: new Date().toISOString(), result: { items } });
  rmSync(path(`${pendingDir}/${f}`));
  applied++;
}
console.log(`${step}: applied ${applied} batches`);
