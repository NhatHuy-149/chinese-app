import type { Config } from '@netlify/functions';
import { aiError, callJson, fail, guard, isMock, json, RATE_LIMIT } from '../lib/ai.ts';
import { mockGrade, mockPassage } from '../lib/mock.ts';
import { LISTEN_GENERATE_SYSTEM, LISTEN_GRADE_SYSTEM, wrapLearner } from '../lib/prompts.ts';
import { GradeResult, ListeningRequest, Passage } from '../lib/schemas.ts';

export default async (req: Request) => {
  const blocked = guard(req);
  if (blocked) return blocked;
  const parsed = ListeningRequest.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return fail(400, 'Yêu cầu không hợp lệ (tóm tắt tối đa 600 ký tự).');
  const body = parsed.data;

  try {
    if (body.action === 'generate') {
      if (isMock(req)) return json({ result: mockPassage(), mock: true });
      const { result } = await callJson({
        endpoint: 'listening-generate', system: LISTEN_GENERATE_SYSTEM,
        user: `Level: ${body.level}\nTopic: ${body.topic}\nKnown words: ${body.known.join(' ')}`,
        schema: Passage, maxTokens: 3000, cache: false, // each passage should be new
      });
      return json({ result });
    }
    if (isMock(req)) return json({ result: mockGrade(body.keyPoints), mock: true });
    const points = body.keyPoints.map((p, i) => `${i}. ${p}`).join('\n');
    const { result } = await callJson({
      endpoint: 'listening-grade', system: LISTEN_GRADE_SYSTEM,
      user: `Passage:\n${body.passageZh}\n\nKey points:\n${points}\n\nLearner summary:\n${wrapLearner(body.summary)}`,
      schema: GradeResult, maxTokens: 1500,
    });
    const total = body.keyPoints.length;
    const caught = [...new Set(result.caught.filter(i => i < total))];
    const missed = [...Array(total).keys()].filter(i => !caught.includes(i));
    return json({ result: { ...result, caught, missed } });
  } catch (e) {
    return aiError(e);
  }
};

export const config: Config = { path: '/api/listening', method: 'POST', rateLimit: RATE_LIMIT };
