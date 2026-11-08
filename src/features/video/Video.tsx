import { useEffect, useMemo, useRef, useState } from 'react';
import { BackButton, Badge, Button, Card, Empty, Icon, Screen, Segmented } from '../../ui/kit';
import { RubyText } from '../../ui/Ruby';
import { back, go, useRoute } from '../../lib/route';
import { useData } from '../../lib/hooks';
import { logEvent } from '../../lib/events';
import { cueAt, fmtTime, makeSegments, parseSubtitles, youtubeId, type Cue } from '../../lib/subtitles';
import { loopAction } from '../../lib/videoLoop';
import {
  fetchTitle, getVideo, getVideoSettings, listVideos, loadYouTubeApi, removeVideo, saveVideo, saveVideoSettings,
  type SavedVideo, type VideoSettings, type YTPlayer,
} from '../../lib/video';

export default function Video() {
  const [view, id] = useRoute();
  if (view === 'play' && id) return <PlayerScreen id={id} />;
  return <Home />;
}

// --- add a video ------------------------------------------------------------------------------
function Home() {
  const videos = useData(listVideos);
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function open() {
    setError('');
    const id = youtubeId(url);
    if (!id) return setError('Link YouTube không hợp lệ.');
    if (!file) return setError('Hãy chọn file phụ đề tiếng Trung (.srt hoặc .vtt).');
    setBusy(true);
    try {
      const cues = parseSubtitles(await file.text());
      if (!cues.length) { setError('File phụ đề không có dòng tiếng Trung nào đọc được. Kiểm tra lại file (.srt/.vtt, có chữ Hán).'); return; }
      const existing = await getVideo(id);
      await saveVideo({
        id, title: existing?.title ?? await fetchTitle(id), cues, subtitleFile: file.name,
        listened: existing?.listened ?? {}, lastSegment: existing?.lastSegment, addedAt: existing?.addedAt ?? Date.now(), openedAt: Date.now(),
      });
      go(`video/play/${id}`);
    } finally { setBusy(false); }
  }

  return (
    <Screen title="Video">
      <Card title="Nghe lại video theo đoạn ngắn">
        <label className="text-sm" htmlFor="yt-url">Link YouTube</label>
        <input id="yt-url" value={url} onChange={e => setUrl(e.target.value)} inputMode="url" autoComplete="off"
          placeholder="https://www.youtube.com/watch?v=…" className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-bg px-3 outline-none focus:border-accent" />
        <label className="mt-3 flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-dashed border-line px-3 text-center text-sm">
          {file ? `Phụ đề: ${file.name}` : 'Chọn file phụ đề tiếng Trung (.srt / .vtt)'}
          <input type="file" accept=".srt,.vtt,text/vtt,application/x-subrip" className="sr-only" onChange={e => setFile(e.target.files?.[0] ?? null)} />
        </label>
        {error && <p className="mt-2 text-sm text-bad">{error}</p>}
        <Button variant="primary" className="mt-3 w-full" disabled={busy || !url.trim() || !file} onClick={open}>Mở video</Button>
        <details className="mt-3 text-sm text-muted">
          <summary className="min-h-[44px] cursor-pointer py-2 text-link">Lấy file phụ đề ở đâu?</summary>
          <p>YouTube chặn việc tự lấy phụ đề từ máy chủ, nên app cần bạn tải file phụ đề:</p>
          <ul className="mt-1 list-disc pl-5">
            <li>Dán link video vào một trang tải phụ đề (ví dụ downsub.com), chọn tiếng Trung, tải bản .srt.</li>
            <li>Hoặc trên máy tính: <code className="text-ink">yt-dlp --write-subs --write-auto-subs --sub-langs "zh.*" --sub-format srt --skip-download LINK</code></li>
          </ul>
          <p className="mt-1">File có thêm dòng dịch (tiếng Việt/Anh) dưới mỗi câu thì app hiện thành dòng dịch.</p>
        </details>
      </Card>

      <Card title="Video đã mở">
        {!videos?.length ? <Empty>Chưa có video nào.</Empty> : (
          <ul className="flex flex-col">
            {videos.map(v => {
              const passes = Object.values(v.listened).reduce((a, b) => a + b, 0);
              return (
                <li key={v.id} className="flex items-center gap-2 border-b border-line py-2 last:border-0">
                  <a href={`#/video/play/${v.id}`} className="flex min-h-[48px] flex-1 flex-col justify-center">
                    <span className="text-sm">{v.title}</span>
                    <span className="text-xs text-muted">{v.cues.length} câu · {fmtTime(v.cues[v.cues.length - 1]?.end ?? 0)} · đã nghe {passes} lượt đoạn</span>
                  </a>
                  <button type="button" aria-label={`Xóa ${v.title}`} className="min-h-[44px] min-w-[44px] text-muted"
                    onClick={() => { if (confirm('Xóa video này khỏi danh sách? (nhật ký luyện nghe vẫn giữ)')) removeVideo(v.id); }}>
                    <Icon name="x" />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </Screen>
  );
}

// --- player -------------------------------------------------------------------------------------
const RATES = [0.5, 0.75, 1, 1.25];
const REPEATS = [1, 2, 3, 5, 10, 0];

function PlayerScreen({ id }: { id: string }) {
  const [video, setVideo] = useState<SavedVideo | null | undefined>();
  const [settings, setSettings] = useState<VideoSettings | null>(null);
  useEffect(() => { getVideo(id).then(v => setVideo(v ?? null)); getVideoSettings().then(setSettings); }, [id]);

  if (video === null) return <Screen title="Video"><BackButton onClick={back} /><Empty>Không tìm thấy video này. Hãy mở lại từ trang Video.</Empty></Screen>;
  if (!video || !settings) return <Screen title="Video"><p className="text-muted">Đang tải…</p></Screen>;
  return <Player video={video} settings={settings} onSettings={s => { setSettings(s); saveVideoSettings(s); }} />;
}

function Player({ video: initial, settings, onSettings }: { video: SavedVideo; settings: VideoSettings; onSettings: (s: VideoSettings) => void }) {
  const [video, setVideo] = useState(initial);
  const cues = video.cues;
  const segments = useMemo(() => makeSegments(cues, settings.segmentMin * 60), [cues, settings.segmentMin]);
  const [segIndex, setSegIndex] = useState(() => Math.min(initial.lastSegment ?? 0, segments.length - 1));
  const [cueIdx, setCueIdx] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [passes, setPasses] = useState(0);
  const [finished, setFinished] = useState(false);
  const [sentenceLoop, setSentenceLoop] = useState<number | null>(null);
  const [showSegmentText, setShowSegmentText] = useState(false);
  const [error, setError] = useState('');
  const host = useRef<HTMLDivElement>(null);
  const player = useRef<YTPlayer | null>(null);
  const lastPassAt = useRef(0);
  const live = useRef({ segIndex, passes, sentenceLoop, settings, segments, video });
  live.current = { segIndex, passes, sentenceLoop, settings, segments, video };

  const seg = segments[segIndex];
  const key = (i: number) => `${settings.segmentMin}:${i}`;

  // create the YouTube player once
  useEffect(() => {
    let destroyed = false;
    loadYouTubeApi().then(() => {
      if (destroyed || !host.current || !window.YT) return;
      player.current = new window.YT.Player(host.current, {
        videoId: video.id,
        playerVars: { playsinline: 1, rel: 0, modestbranding: 1, cc_load_policy: 0, start: Math.floor(seg?.start ?? 0) },
        events: {
          onReady: () => player.current?.setPlaybackRate(settings.rate),
          onStateChange: (e: { data: number }) => setPlaying(e.data === 1),
          onError: () => setError('YouTube không phát được video này (có thể bị chặn nhúng hoặc đã xóa).'),
        },
      });
    }).catch(e => setError((e as Error).message));
    return () => { destroyed = true; player.current?.destroy(); player.current = null; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [video.id]);

  // follow playback: current sentence, segment loop, sentence loop
  useEffect(() => {
    const t = setInterval(() => {
      const p = player.current;
      if (!p?.getCurrentTime) return;
      const now = p.getCurrentTime();
      const { segIndex: si, sentenceLoop: sl, segments: segs, settings: st, passes: ps } = live.current;
      setCueIdx(cueAt(cues, now));
      const action = loopAction({
        now, playing: p.getPlayerState() === 1, segments: segs, segIndex: si,
        sentence: sl !== null ? cues[sl] : null, passes: ps, loop: st.loop, repeat: st.repeat,
      });
      if (action.type === 'seek') p.seekTo(action.to, true);
      else if (action.type === 'follow') selectSegment(action.segIndex, false); // learner jumped elsewhere
      // YouTube may report the old time briefly after a seek: count one pass at most every 1.5 s
      else if (action.type === 'pass' && Date.now() - lastPassAt.current > 1500) { lastPassAt.current = Date.now(); completePass(st, action.again); }
    }, 200);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cues]);

  async function completePass(st: VideoSettings, again: boolean) {
    const { segIndex: si, passes: ps, segments: segs, video: v } = live.current;
    const s = segs[si];
    const p = player.current!;
    const n = ps + 1;
    setPasses(n);
    const updated = { ...v, listened: { ...v.listened, [key(si)]: (v.listened[key(si)] ?? 0) + 1 }, lastSegment: si, openedAt: Date.now() };
    setVideo(updated);
    live.current.video = updated;
    live.current.passes = n;
    saveVideo(updated);
    logEvent({ skill: 'listen', kind: 'video', itemId: `${v.id}:${key(si)}`, durationSec: Math.round((s.end - s.start) / st.rate), countsAsPractice: true,
      metrics: { segmentMin: st.segmentMin, segment: si, pass: n, rate: st.rate } });
    if (again) p.seekTo(s.start, true);
    else { p.pauseVideo(); p.seekTo(s.start, true); setFinished(true); }
  }

  function selectSegment(i: number, play = true) {
    setSegIndex(i); setPasses(0); setFinished(false); setSentenceLoop(null);
    live.current.segIndex = i; live.current.passes = 0; live.current.sentenceLoop = null;
    const s = live.current.segments[i];
    if (play && player.current && s) { player.current.seekTo(s.start, true); player.current.playVideo(); }
  }

  const togglePlay = () => { const p = player.current; if (!p) return; if (playing) p.pauseVideo(); else { setFinished(false); p.playVideo(); } };

  function jumpSentence(delta: number) {
    const p = player.current;
    if (!p) return;
    const now = p.getCurrentTime();
    let i = cueAt(cues, now);
    // "previous" first returns to the start of the current sentence if we are well into it
    if (delta < 0 && i >= 0 && now - cues[i].start > 1.2) delta = 0;
    i = Math.max(0, Math.min(cues.length - 1, i + delta));
    if (sentenceLoop !== null) setSentenceLoop(i);
    p.seekTo(cues[i].start, true);
    p.playVideo();
  }

  function toggleSentenceLoop() {
    const i = cueIdx >= 0 ? cueIdx : seg?.firstCue ?? 0;
    setSentenceLoop(sl => (sl === null ? i : null));
    if (sentenceLoop === null && player.current) { player.current.seekTo(cues[i].start, true); player.current.playVideo(); }
  }

  const update = (patch: Partial<VideoSettings>) => {
    const next = { ...settings, ...patch };
    onSettings(next);
    if (patch.rate) player.current?.setPlaybackRate(patch.rate);
    if (patch.segmentMin) { setSegIndex(0); setPasses(0); setFinished(false); }
  };

  // keyboard: space play/pause, arrows previous/next sentence, R repeat sentence
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select')) return;
      if (e.key === ' ') { e.preventDefault(); togglePlay(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); jumpSentence(-1); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); jumpSentence(1); }
      else if (e.key.toLowerCase() === 'r') toggleSentenceLoop();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const cue: Cue | undefined = cues[cueIdx];
  const inSegment = cue && seg && cueIdx >= seg.firstCue && cueIdx <= seg.lastCue;
  return (
    <Screen title={<span className="line-clamp-1 text-lg">{video.title}</span>}>
      <BackButton onClick={() => go('video')} label="Danh sách video" />
      <div className="lg:grid lg:grid-cols-[1fr_280px] lg:gap-4">
        <div className="flex flex-col gap-3">
          <div className="aspect-video w-full overflow-hidden rounded-[14px] bg-black"><div ref={host} className="h-full w-full" /></div>
          {error && <p className="text-sm text-bad">{error}</p>}

          <Card>
            <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted">
              <Badge>Đoạn {segIndex + 1}/{segments.length}</Badge>
              <span>lần {Math.min(passes + 1, settings.repeat || Infinity)}{settings.repeat ? `/${settings.repeat}` : ''}</span>
              {sentenceLoop !== null && <Badge tone="accent">Đang lặp 1 câu</Badge>}
            </div>
            <div className="flex min-h-[110px] flex-col justify-center text-center">
              {cue && inSegment !== false ? (
                <>
                  {settings.showHanzi
                    ? <RubyText text={cue.zh} showPinyin={settings.showPinyin} className="text-3xl leading-[2.4]" />
                    : settings.showPinyin && <PinyinLine text={cue.zh} />}
                  {settings.showTranslation && cue.tr && <p className="mt-1 text-muted">{cue.tr}</p>}
                </>
              ) : <p className="text-muted">{playing ? '…' : 'Bấm phát để bắt đầu nghe đoạn này.'}</p>}
            </div>
            {finished && (
              <div className="mt-3 rounded-xl border border-ok/40 p-3 text-sm">
                Đã nghe đoạn này {passes} lần.
                {segIndex < segments.length - 1 && <Button variant="primary" className="mt-2 w-full" onClick={() => selectSegment(segIndex + 1)}>Sang đoạn {segIndex + 2}</Button>}
              </div>
            )}
            <div className="mt-3 grid grid-cols-4 gap-2">
              <Button aria-label="Câu trước" onClick={() => jumpSentence(-1)}><Icon name="back" /></Button>
              <Button variant="primary" className="min-h-[44px]" aria-label={playing ? 'Tạm dừng' : 'Phát'} onClick={togglePlay}><Icon name={playing ? 'stop' : 'play'} /></Button>
              <Button aria-label="Câu sau" onClick={() => jumpSentence(1)}><Icon name="back" className="rotate-180" /></Button>
              <Button aria-pressed={sentenceLoop !== null} onClick={toggleSentenceLoop} className={sentenceLoop !== null ? 'border-accent text-accent' : ''}>
                <span className="text-xs">Lặp câu</span>
              </Button>
            </div>
            <p className="mt-2 text-center text-xs text-muted">Phím tắt: Space phát/dừng · ← → câu trước/sau · R lặp câu</p>
          </Card>

          <Card title="Cài đặt nghe">
            <div className="flex flex-col gap-3 text-sm">
              <div><span className="text-muted">Tốc độ</span>
                <Segmented value={String(settings.rate)} onChange={v => update({ rate: Number(v) })} options={RATES.map(r => ({ value: String(r), label: `${r}x` }))} />
              </div>
              <div><span className="text-muted">Độ dài đoạn</span>
                <Segmented value={String(settings.segmentMin)} onChange={v => update({ segmentMin: Number(v) as 3 | 5 | 10 })} options={[3, 5, 10].map(m => ({ value: String(m), label: `${m} phút` }))} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <label className="flex min-h-[44px] items-center gap-2"><input type="checkbox" className="h-5 w-5" checked={settings.loop} onChange={e => update({ loop: e.target.checked })} /> Lặp đoạn</label>
                <label className="flex items-center gap-2">Số lần
                  <select value={settings.repeat} onChange={e => update({ repeat: Number(e.target.value) })} className="min-h-[44px] rounded-lg border border-line bg-bg px-2">
                    {REPEATS.map(r => <option key={r} value={r}>{r === 0 ? 'mãi mãi' : r}</option>)}
                  </select>
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                {([['showHanzi', 'Chữ Hán'], ['showPinyin', 'Pinyin'], ['showTranslation', 'Dịch']] as const).map(([k, label]) => (
                  <button key={k} type="button" aria-pressed={settings[k]} onClick={() => update({ [k]: !settings[k] })}
                    className={`min-h-[40px] rounded-lg border px-3 ${settings[k] ? 'border-accent text-accent' : 'border-line text-muted'}`}>{label}</button>
                ))}
              </div>
            </div>
          </Card>

          <Button onClick={() => setShowSegmentText(s => !s)}>{showSegmentText ? 'Ẩn phụ đề cả đoạn' : 'Xem phụ đề cả đoạn'}</Button>
          {showSegmentText && seg && (
            <Card>
              <ol className="flex flex-col">
                {cues.slice(seg.firstCue, seg.lastCue + 1).map((c, i) => {
                  const idx = seg.firstCue + i;
                  return (
                    <li key={idx}>
                      <button type="button" onClick={() => { player.current?.seekTo(c.start, true); player.current?.playVideo(); }}
                        className={`w-full border-b border-line py-2 text-left last:border-0 ${idx === cueIdx ? 'text-accent' : ''}`}>
                        <span className="mr-2 text-xs text-muted">{fmtTime(c.start)}</span>
                        <RubyText text={c.zh} showPinyin={settings.showPinyin} className="text-lg leading-[2.2]" />
                        {settings.showTranslation && c.tr && <span className="block text-sm text-muted">{c.tr}</span>}
                      </button>
                    </li>
                  );
                })}
              </ol>
            </Card>
          )}
        </div>

        <Card title={`Các đoạn (${settings.segmentMin} phút)`} className="mt-3 lg:mt-0">
          <ul className="flex flex-col">
            {segments.map(s => {
              const n = video.listened[key(s.index)] ?? 0;
              return (
                <li key={s.index}>
                  <button type="button" onClick={() => selectSegment(s.index)} aria-current={s.index === segIndex}
                    className={`flex min-h-[48px] w-full items-center justify-between border-b border-line py-2 text-left text-sm last:border-0 ${s.index === segIndex ? 'text-accent' : ''}`}>
                    <span>Đoạn {s.index + 1} <span className="text-xs text-muted">· {fmtTime(s.start)}–{fmtTime(s.end)} ({fmtTime(s.end - s.start)})</span></span>
                    <span className={`text-xs ${n ? 'text-ok' : 'text-muted'}`}>{n ? `nghe ${n} lần` : 'chưa nghe'}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>
      </div>
    </Screen>
  );
}

function PinyinLine({ text }: { text: string }) {
  const [py, setPy] = useState('');
  useEffect(() => { import('pinyin-pro').then(m => setPy(m.pinyin(text, { toneType: 'symbol' }))); }, [text]);
  return <p className="text-2xl text-link">{py}</p>;
}
