import { describe, expect, it } from 'vitest';
import { cueAt, makeSegments, parseSubtitles, parseTime, youtubeId, type Cue } from './subtitles';

describe('parseSubtitles', () => {
  it('parses SRT with a translation line and strips tags', () => {
    const srt = '1\n00:00:01,000 --> 00:00:03,500\n<i>你好</i>\nXin chào\n\n2\n00:00:04,000 --> 00:00:06,000\n我很好\n';
    expect(parseSubtitles(srt)).toEqual([
      { start: 1, end: 3.5, zh: '你好', tr: 'Xin chào' },
      { start: 4, end: 6, zh: '我很好' },
    ]);
  });
  it('parses WebVTT with short timestamps and settings', () => {
    const vtt = 'WEBVTT\n\n00:01.000 --> 00:02.000 align:start\n今天天气很好\n\nNOTE comment\n';
    expect(parseSubtitles(vtt)).toEqual([{ start: 1, end: 2, zh: '今天天气很好' }]);
  });
  it('skips cues without Chinese and broken times', () => {
    expect(parseSubtitles('1\n00:00:01,000 --> 00:00:02,000\nmusic\n\n2\nxx --> yy\n你好')).toEqual([]);
  });
  it('reads hours', () => expect(parseTime('01:02:03,250')).toBe(3723.25));
});

const cues = (ends: number[]): Cue[] => ends.map((e, i) => ({ start: i === 0 ? 0 : ends[i - 1], end: e, zh: `句${i}` }));

describe('makeSegments', () => {
  it('snaps boundaries to the nearest cue end', () => {
    const c = cues([100, 290, 310, 590, 620, 900]);
    const s = makeSegments(c, 300);
    expect(s.map(x => [x.start, x.end])).toEqual([[0, 290], [290, 590], [590, 900]]);
  });
  it('covers every cue exactly once', () => {
    const c = cues(Array.from({ length: 200 }, (_, i) => (i + 1) * 7));
    const s = makeSegments(c, 180);
    expect(s[0].firstCue).toBe(0);
    expect(s[s.length - 1].lastCue).toBe(199);
    for (let i = 1; i < s.length; i++) expect(s[i].firstCue).toBe(s[i - 1].lastCue + 1);
  });
  it('merges a tiny leftover into the last segment', () => {
    const s = makeSegments(cues([150, 300, 320]), 300);
    expect(s).toHaveLength(1);
  });
  it('handles a single long cue and empty input', () => {
    expect(makeSegments(cues([1000]), 300)).toHaveLength(1);
    expect(makeSegments([], 300)).toEqual([]);
  });
});

describe('helpers', () => {
  it('finds the cue at a time, including gaps', () => {
    const c: Cue[] = [{ start: 1, end: 2, zh: 'a' }, { start: 5, end: 6, zh: 'b' }];
    expect([cueAt(c, 0), cueAt(c, 1.5), cueAt(c, 3), cueAt(c, 5.5)]).toEqual([-1, 0, 0, 1]);
  });
  it('extracts YouTube ids', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://youtu.be/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('https://m.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(youtubeId('not a url')).toBeNull();
  });
});
