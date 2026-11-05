// Shared runtime for the AI functions: passcode check, mock mode, cached + validated LLM calls.
// Credentials come from Netlify AI Gateway (injected ANTHROPIC_API_KEY / ANTHROPIC_BASE_URL),
// or from a provider key set in the site's environment variables. Never from the browser.
import Anthropic from '@anthropic-ai/sdk';
import { getStore } from '@netlify/blobs';
import { createHash } from 'node:crypto';
import type { z } from 'zod';

const env = (k: string) => (typeof Netlify !== 'undefined' ? Netlify.env.get(k) : process.env[k]);

export const MODEL = env('AI_MODEL') ?? 'claude-haiku-5-5';
export const isMock = (req: Request) => env('AI_MOCK') === '1' || req.headers.get('x-mock') === '1';

export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

export const fail = (status: number, message: string) => json({ error: message }, status);

/** Returns an error response when the request may not use the AI, otherwise null. */
export function guard(req: Request): Response | null {
  if (req.method !== 'POST') return fail(405, 'Chỉ nhận POST.');
  const passcode = env('APP_PASSCODE');
  if (!passcode) return fail(503, 'Máy chủ chưa đặt APP_PASSCODE nên chưa dùng được AI.');
  if (req.headers.get('x-app-passcode') !== passcode) return fail(401, 'Sai mật khẩu truy cập. Vào Cài đặt để nhập lại.');
  return null;
}

/** Pulls the first JSON object out of a model reply (tolerates code fences). */
export function extractJson(text: string): unknown {
  const t = text.trim().replace(/^```(?:json)?/i, '').replace(/```\s*$/, '');
  const i = t.indexOf('{'), j = t.lastIndexOf('}');
  if (i < 0 || j <= i) throw new Error('no json object');
  return JSON.parse(t.slice(i, j + 1));
}

let client: Anthropic | null = null;

/**
 * One validated call: plain JSON-in-text (works through any gateway), schema check,
 * one retry on bad format. Results are cached by hash of (endpoint, model, input).
 */
export async function callJson<T>(opts: {
  endpoint: string; system: string; user: string; schema: z.ZodType<T>; maxTokens: number; cache?: boolean;
}): Promise<{ result: T; cached: boolean }> {
  const key = createHash('sha256').update([opts.endpoint, MODEL, opts.system, opts.user].join('\n')).digest('hex');
  const store = opts.cache === false ? null : safeStore();
  if (store) {
    const hit = await store.get(key, { type: 'json' }).catch(() => null);
    if (hit) return { result: opts.schema.parse(hit), cached: true };
  }
  client ??= new Anthropic();
  let lastError: unknown;
  for (let attempt = 1; attempt <= 2; attempt++) {
    const res = await client.messages.create({
      model: MODEL,
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
    });
    console.log(JSON.stringify({ endpoint: opts.endpoint, model: MODEL, in: res.usage.input_tokens, out: res.usage.output_tokens, stop: res.stop_reason }));
    if (res.stop_reason === 'refusal') throw new Error('refusal');
    const text = res.content.map(b => (b.type === 'text' ? b.text : '')).join('');
    try {
      const result = opts.schema.parse(extractJson(text));
      if (store) await store.setJSON(key, result).catch(() => undefined);
      return { result, cached: false };
    } catch (e) {
      lastError = e;
    }
  }
  throw new Error(`invalid format: ${String(lastError)}`);
}

function safeStore() {
  try { return getStore('ai-cache'); } catch { return null; }
}

/** Maps any failure to a short Vietnamese message (details only in the function log). */
export function aiError(e: unknown): Response {
  console.error(e);
  const msg = String(e);
  if (/invalid format/.test(msg)) return fail(502, 'AI trả kết quả sai định dạng, đã thử lại nhưng vẫn lỗi. Hãy thử lại sau.');
  if (/refusal/.test(msg)) return fail(422, 'AI từ chối xử lý nội dung này.');
  if (/429|rate/i.test(msg)) return fail(429, 'Đã hết lượt gọi AI tạm thời. Đợi một lúc rồi thử lại.');
  if (/401|403|api.?key|auth/i.test(msg)) return fail(503, 'Máy chủ chưa kết nối được AI (thiếu hoặc sai khóa / AI Gateway chưa bật).');
  return fail(502, 'Không gọi được AI. Kiểm tra mạng hoặc thử lại sau.');
}

/** Same per-IP limit for all AI endpoints (Netlify built-in rate limiting). */
export const RATE_LIMIT = { action: 'rate_limit' as const, aggregateBy: ['ip', 'domain'] as Array<'ip' | 'domain'>, windowSize: 60, windowLimit: 20 };
