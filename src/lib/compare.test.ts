import { describe, expect, it } from 'vitest';
import { diffChars, sameZh } from './compare';

describe('diffChars', () => {
  it('ignores punctuation and spaces', () => {
    expect(sameZh('我 很好。', '我很好')).toBe(true);
    expect(diffChars('你好！', '你好').matchPct).toBe(100);
  });
  it('marks missing characters', () => {
    const d = diffChars('我买了一本书', '我买一本书');
    expect(d.parts.filter(p => !p.ok).map(p => p.ch)).toEqual(['了']);
    expect(d.matchPct).toBe(83);
  });
  it('penalises extra characters', () => {
    expect(diffChars('你好', '你好你好').matchPct).toBe(50);
  });
  it('handles empty input', () => {
    expect(diffChars('你好', '').matchPct).toBe(0);
  });
});
