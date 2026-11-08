// Saved videos (YouTube id + uploaded subtitles + per-segment listen counts) and player settings.
// Stored in the IndexedDB kv store; the video itself is never downloaded.
import { kvGet, kvSet, notifyChange } from './storage';
import type { Cue } from './subtitles';

export type SavedVideo = {
  id: string;            // YouTube video id
  title: string;
  cues: Cue[];
  subtitleFile: string;  // name of the uploaded file
  listened: Record<string, number>; // `${segmentLength}:${index}` -> completed passes
  lastSegment?: number;
  addedAt: number;
  openedAt: number;
};

export type VideoSettings = {
  segmentMin: 3 | 5 | 10;
  loop: boolean;
  repeat: number;        // passes per segment before pausing (0 = endless)
  rate: number;
  showHanzi: boolean;
  showPinyin: boolean;
  showTranslation: boolean;
};

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = {
  segmentMin: 5, loop: true, repeat: 3, rate: 1, showHanzi: true, showPinyin: true, showTranslation: true,
};

export const listVideos = () => kvGet<SavedVideo[]>('videos', []);

export async function getVideo(id: string): Promise<SavedVideo | undefined> {
  return (await listVideos()).find(v => v.id === id);
}

export async function saveVideo(v: SavedVideo): Promise<void> {
  const all = (await listVideos()).filter(x => x.id !== v.id);
  await kvSet('videos', [v, ...all]);
  notifyChange();
}

export async function removeVideo(id: string): Promise<void> {
  await kvSet('videos', (await listVideos()).filter(x => x.id !== id));
  notifyChange();
}

export async function getVideoSettings(): Promise<VideoSettings> {
  return { ...DEFAULT_VIDEO_SETTINGS, ...(await kvGet<Partial<VideoSettings>>('videoSettings', {})) };
}

export const saveVideoSettings = (s: VideoSettings) => kvSet('videoSettings', s);

/** Title via YouTube oEmbed (no API key); falls back to the id when unavailable. */
export async function fetchTitle(id: string): Promise<string> {
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${id}`)}`);
    if (r.ok) return (await r.json()).title ?? id;
  } catch { /* offline or blocked */ }
  return `Video ${id}`;
}

// --- YouTube IFrame Player API ------------------------------------------------------------
type YTPlayer = {
  playVideo(): void; pauseVideo(): void; seekTo(s: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number; getPlayerState(): number; setPlaybackRate(r: number): void;
  getAvailablePlaybackRates(): number[]; destroy(): void;
};
declare global {
  interface Window { YT?: { Player: new (el: HTMLElement, opts: unknown) => YTPlayer; PlayerState: Record<string, number> }; onYouTubeIframeAPIReady?: () => void }
}
export type { YTPlayer };

let apiPromise: Promise<void> | null = null;
export function loadYouTubeApi(): Promise<void> {
  apiPromise ??= new Promise((resolve, reject) => {
    if (window.YT?.Player) return resolve();
    window.onYouTubeIframeAPIReady = () => resolve();
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.onerror = () => { apiPromise = null; reject(new Error('Không tải được trình phát YouTube (cần mạng).')); };
    document.head.appendChild(s);
  });
  return apiPromise;
}
