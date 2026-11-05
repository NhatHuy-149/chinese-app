import type { Config } from '@netlify/functions';
import { aiError, callJson, fail, guard, isMock, json, RATE_LIMIT } from '../lib/ai.ts';
import { mockSentence } from '../lib/mock.ts';
import { CHECK_SYSTEM, wrapLearner } from '../lib/prompts.ts';
import { CheckRequest, SentenceResult } from '../lib/schemas.ts';

export default async (req: Request) => {
  const blocked = guard(req);
  if (blocked) return blocked;
  const parsed = CheckRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, 'Câu quá dài hoặc trống (tối đa 300 ký tự).');
  const { text, words, focusTag } = parsed.data;
  if (isMock(req)) return json({ result: mockSentence(text), mock: true });

  const context = [
    words?.length ? `The learner was asked to use these words: ${words.join(', ')}.` : '',
    focusTag ? `The learner is practising this error type: ${focusTag}.` : '',
  ].filter(Boolean).join('\n');
  try {
    const { result, cached } = await callJson({
      endpoint: 'check-sentence', system: CHECK_SYSTEM, user: `${context}\n${wrapLearner(text)}`.trim(),
      schema: SentenceResult, maxTokens: 2000,
    });
    return json({ result, cached });
  } catch (e) {
    return aiError(e);
  }
};

export const config: Config = { path: '/api/check-sentence', method: 'POST', rateLimit: RATE_LIMIT };
