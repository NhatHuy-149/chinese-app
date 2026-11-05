import { describe, expect, it } from 'vitest';
import { extractJson } from './ai.ts';
import { GradeResult, SentenceResult } from './schemas.ts';
import { mockGrade, mockSentence } from './mock.ts';

describe('LLM output parsing', () => {
  it('extracts JSON from fenced or chatty replies', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
    expect(extractJson('Here you go: {"a":{"b":2}} done')).toEqual({ a: { b: 2 } });
    expect(() => extractJson('no json')).toThrow();
  });
  it('rejects error tags outside the fixed list', () => {
    const bad = { ...mockSentence('x'), error_tags: ['ngữ pháp'] };
    expect(SentenceResult.safeParse(bad).success).toBe(false);
    expect(SentenceResult.safeParse(mockSentence('x')).success).toBe(true);
  });
  it('validates grade results', () => {
    expect(GradeResult.safeParse(mockGrade(['a', 'b', 'c'])).success).toBe(true);
    expect(GradeResult.safeParse({ score: 120, caught: [], missed: [], feedback: '' }).success).toBe(false);
  });
});
