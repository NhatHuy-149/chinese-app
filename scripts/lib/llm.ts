// Build-time LLM helper: one cached, schema-validated call per batch.
// Results are stored in data/llm/<step>/<key>.json (committed), so re-runs cost nothing
// and a failed run resumes where it stopped. Set LLM_MOCK=1 to run without an API key.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import type { z } from 'zod';
import { createHash } from 'node:crypto';
import { exists, readJson, writeJson } from './io.ts';

export const MOCK = process.env.LLM_MOCK === '1';
/**
 * LLM_MANUAL=1: no API call. Uncached batches are written to data/llm-pending/<step>/<key>.json
 * for a person (or a Claude Code session) to answer in data/llm-answers/<step>/<key>.tsv;
 * `npm run data:apply` validates the answers and stores them in the normal cache.
 */
export const MANUAL = process.env.LLM_MANUAL === '1';

// USD per million tokens (input, output), from the Claude API skill table dated 2026-10-06.
const PRICES: Record<string, [number, number]> = {
  'claude-haiku-5-5': [0.1, 0.5],
  'claude-sonnet-5-5': [2, 10],
  'claude-opus-5-5': [4, 20],
};

const usage = { calls: 0, cached: 0, input: 0, output: 0, usd: 0 };
let client: Anthropic | null = null;

export type CallSpec<T> = {
  step: string;            // folder name, e.g. "classify"
  key: string;             // stable batch key, e.g. "0003"
  model: string;
  effort?: 'low' | 'medium' | 'high';
  system: string;
  user: string;
  schema: z.ZodType<T>;
  maxTokens: number;
  mock: () => T;           // used when LLM_MOCK=1
  ids?: string[];          // item ids in order (needed for LLM_MANUAL answers)
};

let pending = 0;
export const pendingCount = () => pending;

/** Returns the cached or new result; in LLM_MANUAL mode returns null for unanswered batches. */
export async function cachedCall<T>(spec: CallSpec<T>): Promise<T | null> {
  const file = `data/llm/${MOCK ? 'mock-' : ''}${spec.step}/${spec.key}.json`;
  if (exists(file)) { usage.cached++; return readJson<{ result: T }>(file).result; }
  if (MANUAL) {
    writeJson(`data/llm-pending/${spec.step}/${spec.key}.json`, { system: spec.system, user: spec.user, ids: spec.ids ?? [] });
    pending++;
    return null;
  }

  const result = MOCK ? spec.mock() : await callWithRetry(spec);
  writeJson(file, { model: MOCK ? 'mock' : spec.model, createdAt: new Date().toISOString(), result });
  return result;
}

async function callWithRetry<T>(spec: CallSpec<T>): Promise<T> {
  client ??= new Anthropic();
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await client.messages.parse({
      model: spec.model,
      max_tokens: spec.maxTokens,
      system: spec.system,
      messages: [{ role: 'user', content: spec.user }],
      output_config: { format: zodOutputFormat(spec.schema), ...(spec.effort ? { effort: spec.effort } : {}) },
    });
    track(spec.model, res.usage);
    if (res.stop_reason === 'refusal') throw new Error(`${spec.step}/${spec.key}: refused`);
    if (res.parsed_output) return res.parsed_output as T;
    console.warn(`${spec.step}/${spec.key}: invalid output (stop_reason=${res.stop_reason}), attempt ${attempt}`);
  }
  throw new Error(`${spec.step}/${spec.key}: no valid output after retry`);
}

function track(model: string, u: { input_tokens: number; output_tokens: number }) {
  const [pin, pout] = PRICES[model] ?? [0, 0];
  usage.calls++;
  usage.input += u.input_tokens;
  usage.output += u.output_tokens;
  usage.usd += (u.input_tokens * pin + u.output_tokens * pout) / 1e6;
}

export function usageReport(): string {
  const base = `LLM calls: ${usage.calls} new, ${usage.cached} cached; tokens in ${usage.input}, out ${usage.output}; ~$${usage.usd.toFixed(2)}`;
  return pending ? `${base}; ${pending} batches pending in data/llm-pending/` : base;
}

/** Runs async jobs with a small concurrency limit. */
export async function pool<T, R>(items: T[], limit: number, job: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) { const i = next++; out[i] = await job(items[i], i); }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export const chunk = <T>(arr: T[], size: number): T[][] =>
  Array.from({ length: Math.ceil(arr.length / size) }, (_, i) => arr.slice(i * size, i * size + size));

/** Cache key that changes whenever the batch content or prompt changes, so stale results are never reused. */
export const batchKey = (i: number, ...parts: string[]) =>
  `${String(i).padStart(4, '0')}-${createHash('sha1').update(parts.join('\n')).digest('hex').slice(0, 8)}`;
