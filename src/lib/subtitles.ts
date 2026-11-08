// Subtitle parsing (.srt / .vtt) and splitting a video timeline into listening segments.
export type Cue = { start: number; end: number; zh: string; tr?: string }; // seconds
export type Segment = { index: number; start: number; end: number; firstCue: number; lastCue: number };

const HAN = /\p{Script=Han}/u;

/** "00:01:02,500" | "01:02.5" | "1:02:03.250" -> seconds */
export function parseTime(t: string): number {
  const parts = t.trim().replace(',', '.').split(':').map(Number);
  if (parts.some(Number.isNaN)) return NaN;
  return parts.reduce((acc, p) => acc * 60 + p, 0);
}

/**
 * Parses SRT or WebVTT text. Lines containing Chinese characters become the Chinese text;
 * other lines (e.g. a Vietnamese/English second line) become the optional translation.
 */
export function parseSubtitles(text: string): Cue[] {
  const blocks = text.replace(/\r/g, '').replace(/^﻿/, '').split(/\n\s*\n/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trim()).filter(Boolean);
    const timeIdx = lines.findIndex(l => l.includes('-->'));
    if (timeIdx < 0) continue;
    const [a, b] = lines[timeIdx].split('-->');
    const start = parseTime(a), end = parseTime(b.trim().split(/\s+/)[0]);
    if (Number.isNaN(start) || Number.isNaN(end) || end <= start) continue;
    const body = lines.slice(timeIdx + 1).map(l => l.replace(/<[^>]+>/g, '').replace(/\{\\[^}]*\}/g, '').trim()).filter(Boolean);
    const zh = body.filter(l => HAN.test(l)).join(' ');
    const tr = body.filter(l => !HAN.test(l)).join(' ');
    if (!zh) continue;
    cues.push({ start, end, zh, ...(tr ? { tr } : {}) });
  }
  return cues.sort((x, y) => x.start - y.start);
}

/**
 * Splits cues into segments of about `targetSec`. Each boundary is snapped to the cue end
 * closest to the target time, so no sentence is cut in half.
 */
export function makeSegments(cues: Cue[], targetSec: number): Segment[] {
  const segments: Segment[] = [];
  let first = 0;
  while (first < cues.length) {
    // segments are contiguous, so gaps between subtitles are never skipped
    const segStart = segments.length === 0 ? 0 : segments[segments.length - 1].end;
    const target = segStart + targetSec;
    let last = first;
    let best = Math.abs(cues[first].end - target);
    for (let i = first + 1; i < cues.length; i++) {
      const d = Math.abs(cues[i].end - target);
      // on a tie keep the earlier boundary, so a segment does not run past the target
      if (d < best) { best = d; last = i; } else if (cues[i].end > target) break;
    }
    // avoid a tiny leftover segment at the end (under a third of the target)
    const rest = cues.length - 1 > last ? cues[cues.length - 1].end - cues[last].end : 0;
    if (rest > 0 && rest < targetSec / 3) last = cues.length - 1;
    segments.push({ index: segments.length, start: segStart, end: cues[last].end, firstCue: first, lastCue: last });
    first = last + 1;
  }
  return segments;
}

export function cueAt(cues: Cue[], t: number): number {
  for (let i = 0; i < cues.length; i++) if (t >= cues[i].start && t < cues[i].end) return i;
  // between cues: the last cue that started before t
  let idx = -1;
  for (let i = 0; i < cues.length && cues[i].start <= t; i++) idx = i;
  return idx;
}

export const fmtTime = (s: number) => {
  const m = Math.floor(s / 60), sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
};

/** YouTube video id from a URL or a bare id; null when not recognised. */
export function youtubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
  return m ? m[1] : null;
}
