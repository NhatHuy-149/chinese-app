import type { Config } from '@netlify/functions';
import { aiError, callJson, fail, guard, isMock, json, RATE_LIMIT } from '../lib/ai.ts';
import { mockSentence } from '../lib/mock.ts';
import { SPEECH_SYSTEM, wrapLearner } from '../lib/prompts.ts';
import { SentenceResult, SpeechRequest } from '../lib/schemas.ts';

export default async (req: Request) => {
  const blocked = guard(req);
  if (blocked) return blocked;
  const parsed = SpeechRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, 'Nội dung nói quá dài hoặc trống (tối đa 600 ký tự).');
  const { text, prompt } = parsed.data;
  if (isMock(req)) return json({ result: mockSentence(text), mock: true });
  try {
    const { result, cached } = await callJson({
      endpoint: 'correct-speech', system: SPEECH_SYSTEM,
      user: `${prompt ? `Speaking task given to the learner: ${prompt}\n` : ''}${wrapLearner(text)}`,
      schema: SentenceResult, maxTokens: 2500,
    });
    return json({ result, cached });
  } catch (e) {
    return aiError(e);
  }
};

export const config: Config = { path: '/api/correct-speech', method: 'POST', rateLimit: RATE_LIMIT };
