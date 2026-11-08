// Decides what the player should do at the current playback time (pure, unit-tested).
import type { Segment } from './subtitles';

export type LoopState = {
  now: number;                 // current playback time (s)
  playing: boolean;
  segments: Segment[];
  segIndex: number;
  sentence: { start: number; end: number } | null; // single-sentence loop
  passes: number;              // completed passes of the current segment
  loop: boolean;
  repeat: number;              // 0 = endless
};

export type LoopAction =
  | { type: 'none' }
  | { type: 'seek'; to: number }                         // repeat the sentence
  | { type: 'follow'; segIndex: number }                 // learner jumped to another segment
  | { type: 'pass'; again: boolean; to: number };        // segment finished: loop again or stop

const END_MARGIN = 0.15;

export function loopAction(s: LoopState): LoopAction {
  if (s.sentence) return s.now >= s.sentence.end ? { type: 'seek', to: s.sentence.start } : { type: 'none' };
  const seg = s.segments[s.segIndex];
  if (!seg) return { type: 'none' };
  if (s.now < seg.start - 1 || s.now > seg.end + 2) {
    const found = s.segments.findIndex(x => s.now >= x.start && s.now < x.end);
    return found >= 0 && found !== s.segIndex ? { type: 'follow', segIndex: found } : { type: 'none' };
  }
  if (s.playing && s.now >= seg.end - END_MARGIN) {
    const n = s.passes + 1;
    return { type: 'pass', again: s.loop && (s.repeat === 0 || n < s.repeat), to: seg.start };
  }
  return { type: 'none' };
}
