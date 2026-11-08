import { describe, expect, it } from 'vitest';
import { loopAction, type LoopState } from './videoLoop';

const segments = [
  { index: 0, start: 0, end: 300, firstCue: 0, lastCue: 9 },
  { index: 1, start: 300, end: 600, firstCue: 10, lastCue: 19 },
];
const base: LoopState = { now: 10, playing: true, segments, segIndex: 0, sentence: null, passes: 0, loop: true, repeat: 3 };

describe('loopAction', () => {
  it('does nothing inside the segment', () => expect(loopAction(base)).toEqual({ type: 'none' }));
  it('loops at the segment end until the repeat count is reached', () => {
    expect(loopAction({ ...base, now: 299.9 })).toEqual({ type: 'pass', again: true, to: 0 });
    expect(loopAction({ ...base, now: 300, passes: 2 })).toEqual({ type: 'pass', again: false, to: 0 });
  });
  it('loops forever with repeat 0 and stops after one pass with loop off', () => {
    expect(loopAction({ ...base, now: 300, passes: 99, repeat: 0 })).toMatchObject({ again: true });
    expect(loopAction({ ...base, now: 300, loop: false })).toMatchObject({ again: false });
  });
  it('ignores the end while paused', () => expect(loopAction({ ...base, now: 300, playing: false })).toEqual({ type: 'none' }));
  it('repeats a single sentence', () => {
    const sentence = { start: 20, end: 24 };
    expect(loopAction({ ...base, now: 24.1, sentence })).toEqual({ type: 'seek', to: 20 });
    expect(loopAction({ ...base, now: 22, sentence })).toEqual({ type: 'none' });
  });
  it('follows the learner to another segment', () => {
    expect(loopAction({ ...base, now: 450 })).toEqual({ type: 'follow', segIndex: 1 });
    expect(loopAction({ ...base, now: 9999 })).toEqual({ type: 'none' });
  });
});
