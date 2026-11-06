import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Icon, Screen, Segmented } from '../../ui/kit';
import { CorrectionCard, DiffText } from '../../ui/Correction';
import { RECOGNITION_OK, RECORDING_OK, Recorder, type Take } from '../../lib/speech';
import { compareByPinyin, type ToneHint } from '../../lib/pinyinCompare';
import { diffChars } from '../../lib/compare';
import { speak, stopSpeaking } from '../../lib/tts';
import { flagWrong, logEvent, type PracticeEvent } from '../../lib/events';
import { ApiError, correctSpeech, type SentenceResult } from '../../lib/api';
import { allSentences } from '../../lib/sentences';
import { allCards } from '../../lib/vocab';
import { loadAllWords } from '../../lib/words';

type Target = { zh: string; py: string; vi: string; from: string };

/** Pool of sentences to shadow: saved sentences, examples of studied words, hand-written sentences. */
async function loadTargets(): Promise<Target[]> {
  const [saved, cards, words, legacy] = await Promise.all([
    allSentences(), allCards(), loadAllWords(),
    fetch('/data/sentences.json').then(r => r.json() as Promise<Array<{ zh: string; py: string; vi: string }>>).catch(() => []),
  ]);
  const studied = [...new Set(cards.filter(c => c.dir !== 'sentence').map(c => c.wordId))].map(id => words.get(id)?.example).filter(Boolean);
  const pool: Target[] = [
    ...saved.map(s => ({ zh: s.hanzi, py: s.pinyin, vi: s.meaning, from: 'Câu đã lưu' })),
    ...studied.map(e => ({ ...e!, from: 'Ví dụ của từ đang học' })),
    ...legacy.map(s => ({ ...s, from: 'Câu mẫu' })),
  ];
  return pool;
}

const FREE_PROMPTS = [
  'Giới thiệu bản thân (tên, quê, công việc).', 'Hôm nay bạn đã ăn gì?', 'Kể về gia đình bạn.',
  'Cuối tuần này bạn định làm gì?', 'Công việc của bạn hằng ngày thế nào?', 'Thời tiết hôm nay ra sao?',
  'Bạn thích làm gì lúc rảnh?', 'Kể về một người bạn thân.', 'Bạn đi làm bằng gì? Mất bao lâu?',
  'Món ăn Việt Nam bạn thích nhất là gì?',
];

export default function Speak() {
  const [mode, setMode] = useState<'shadow' | 'free'>('shadow');
  const [custom, setCustom] = useState<Target | null>(null);
  return (
    <Screen title="Nói">
      {!RECOGNITION_OK && (
        <Card className="border-accent/60">
          <p className="text-sm"><b className="text-accent">Trình duyệt này không có nhận diện giọng nói</b>, nên máy không biết bạn nói gì và không chấm được.</p>
          <p className="mt-1 text-sm text-muted">Để máy chấm: mở app bằng <b className="text-ink">Chrome</b> trên Android (hoặc Safari trên iPhone). Ở đây bạn vẫn ghi âm, nghe lại và tự so với mẫu được.</p>
        </Card>
      )}
      <p className="text-xs text-muted">
        Nhận diện giọng nói chỉ cho biết máy có "hiểu" bạn hay không, không chấm chính xác thanh điệu và phát âm.
        {!RECORDING_OK && ' Trình duyệt này không ghi âm được.'}
      </p>
      <Segmented value={mode} onChange={setMode} options={[{ value: 'shadow', label: 'Nhại theo mẫu' }, { value: 'free', label: 'Nói tự do' }]} />
      {mode === 'shadow'
        ? <Shadow custom={custom} onCustomDone={() => setCustom(null)} />
        : <Free onShadow={t => { setCustom(t); setMode('shadow'); }} />}
    </Screen>
  );
}

/** Big round record button with elapsed time; returns the take when stopped. */
function RecordButton({ onTake, onLive, maxSeconds = 60 }: { onTake: (t: Take) => void; onLive?: (text: string) => void; maxSeconds?: number }) {
  const rec = useRef<Recorder | null>(null);
  const [active, setActive] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!active) return;
    const started = Date.now();
    const t = setInterval(() => {
      const s = Math.floor((Date.now() - started) / 1000);
      setElapsed(s);
      if (s >= maxSeconds) toggle();
    }, 250);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function toggle() {
    setError('');
    if (!active) {
      stopSpeaking();
      const r = new Recorder();
      r.onText = text => onLive?.(text);
      try { await r.start(); } catch (e) { setError((e as Error).message); return; }
      rec.current = r; setElapsed(0); setActive(true);
    } else {
      setActive(false);
      const take = await rec.current!.stop();
      rec.current = null;
      onTake(take);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button type="button" onClick={toggle} disabled={!RECORDING_OK && !RECOGNITION_OK}
        aria-label={active ? 'Dừng ghi âm' : 'Bắt đầu ghi âm'}
        className={`flex h-20 w-20 items-center justify-center rounded-full border-4 ${active ? 'border-bad bg-bad/20 text-bad' : 'border-accent bg-card text-accent'}`}>
        <Icon name={active ? 'stop' : 'mic'} size={32} />
      </button>
      <span className="text-sm text-muted">{active ? `Đang ghi… ${elapsed}s (bấm để dừng)` : 'Bấm để nói'}</span>
      {error && <p className="text-center text-sm text-bad">{error}</p>}
    </div>
  );
}

function Shadow({ custom, onCustomDone }: { custom: Target | null; onCustomDone: () => void }) {
  const [pool, setPool] = useState<Target[]>([]);
  const [target, setTarget] = useState<Target | null>(custom);
  const [rate, setRate] = useState<'0.7' | '1'>('1');
  const [live, setLive] = useState('');
  const [take, setTake] = useState<Take | null>(null);
  const [score, setScore] = useState<{ matchPct: number; hints: ToneHint[] } | null>(null);
  const [selfRated, setSelfRated] = useState<boolean | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => { loadTargets().then(p => { setPool(p); if (!custom) setTarget(pickRandom(p)); }); }, [custom]);
  const pickRandom = (p: Target[]) => p.length ? p[Math.floor(Math.random() * Math.min(p.length, 400))] : null;

  function next() {
    setTake(null); setScore(null); setLive(''); setSelfRated(null);
    if (custom) onCustomDone(); else setTarget(pickRandom(pool));
  }

  async function onTake(t: Take) {
    setTake(t);
    if (!target) return;
    if (t.text) {
      const s = await compareByPinyin(target.zh, t.text);
      setScore(s);
      await logEvent({ skill: 'speak', kind: 'shadow', itemId: target.zh, durationSec: t.seconds, countsAsPractice: true,
        metrics: { mode: 'shadow', matchPct: s.matchPct, speakSec: t.seconds }, errorTags: s.hints.some(h => h.kind === 'tone') ? ['thanh điệu'] : [] });
    } else if (!RECOGNITION_OK) {
      // no recognition: the learner rates themselves after listening back (logged on rating)
    } else {
      await logEvent({ skill: 'speak', kind: 'shadow', itemId: target.zh, durationSec: t.seconds, countsAsPractice: true, metrics: { mode: 'shadow', speakSec: t.seconds, heardNothing: true } });
    }
  }

  async function rateSelf(good: boolean) {
    if (!take || !target) return;
    await logEvent({ skill: 'speak', kind: 'shadow', itemId: target.zh, durationSec: take.seconds, countsAsPractice: true, metrics: { mode: 'shadow', speakSec: take.seconds, selfRated: good } });
    setSelfRated(good);
  }

  if (!target) return <p className="text-muted">Đang tải câu mẫu…</p>;
  const diff = take?.text ? diffChars(target.zh, take.text) : null;
  return (
    <>
      <Card>
        <div className="mb-2 flex justify-between"><Badge>{target.from}</Badge><Button variant="ghost" onClick={next}>Câu khác</Button></div>
        <div className="han text-3xl font-bold leading-snug">{diff ? <DiffText parts={diff.parts} /> : target.zh}</div>
        <div className="mt-1 text-link">{target.py}</div>
        <div className="text-muted">{target.vi}</div>
        <div className="mt-3 flex items-center gap-2">
          <Button onClick={() => speak(target.zh, Number(rate))}><span className="inline-flex items-center gap-1"><Icon name="play" /> Nghe mẫu</span></Button>
          <div className="flex-1"><Segmented value={rate} onChange={setRate} options={[{ value: '0.7', label: '0.7x' }, { value: '1', label: '1x' }]} /></div>
        </div>
      </Card>
      {!take && <RecordButton onTake={onTake} onLive={setLive} maxSeconds={30} />}
      {!take && live && <p className="han text-center text-lg text-muted">{live}</p>}
      {take && (
        <Card title={RECOGNITION_OK ? 'Máy nghe được' : 'Tự so với mẫu'}>
          {take.error && <p className="mb-2 text-sm text-bad">{take.error}</p>}
          {take.text
            ? <>
                <p className="han text-2xl">{take.text}</p>
                {score && <p className="mt-2 text-lg">Khớp <b>{score.matchPct}%</b> <span className="text-sm text-muted">(so pinyin có thanh điệu)</span></p>}
                {score?.hints.filter(h => h.kind === 'tone').map((h, i) => (
                  <p key={i} className="text-sm text-muted">Có thể sai thanh: <span className="han">{h.target}</span> cần đọc <b className="text-ink">{h.targetPy}</b>, máy nghe thành <span className="han">{h.heard}</span> ({h.heardPy}).</p>
                ))}
                {score?.hints.some(h => h.kind === 'homophone') && <p className="text-xs text-muted">Một số chữ khác nhưng cùng âm: thường do máy chọn chữ đồng âm, không phải lỗi phát âm.</p>}
              </>
            : RECOGNITION_OK ? <p className="text-muted">Máy không nghe ra câu nào. Nói to, rõ và gần micro hơn.</p>
              : <>
                  <p className="text-sm text-muted">Nghe mẫu rồi nghe ngay bản của bạn, chú ý thanh điệu từng chữ, sau đó tự chấm.</p>
                  {take.audioUrl && <Button className="mt-2 w-full" onClick={async () => { await speak(target.zh, Number(rate)); audioRef.current?.play(); }}>
                    <span className="inline-flex items-center gap-1"><Icon name="play" /> Nghe mẫu rồi nghe bản của tôi</span>
                  </Button>}
                  {selfRated === null
                    ? <div className="mt-2 grid grid-cols-2 gap-2">
                        <Button onClick={() => rateSelf(false)}>Chưa giống mẫu</Button>
                        <Button onClick={() => rateSelf(true)}>Giống mẫu</Button>
                      </div>
                    : <p className="mt-2 text-sm">Đã ghi nhận: <b className={selfRated ? 'text-ok' : 'text-bad'}>{selfRated ? 'Giống mẫu' : 'Chưa giống mẫu'}</b>. Đã tính 1 câu vào mục tiêu Nói.</p>}
                </>}
          {take.audioUrl && <audio ref={audioRef} className="mt-3 w-full" controls src={take.audioUrl} aria-label="Bản ghi của tôi" />}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Button onClick={() => { setTake(null); setScore(null); setLive(''); setSelfRated(null); }}><span className="inline-flex items-center gap-1"><Icon name="replay" /> Thử lại</span></Button>
            <Button variant="primary" className="min-h-[44px]" onClick={next}>Câu tiếp</Button>
          </div>
        </Card>
      )}
    </>
  );
}

function Free({ onShadow }: { onShadow: (t: Target) => void }) {
  const [promptText, setPromptText] = useState(() => FREE_PROMPTS[Math.floor(Math.random() * FREE_PROMPTS.length)]);
  const [text, setText] = useState('');
  const [take, setTake] = useState<Take | null>(null);
  const [result, setResult] = useState<{ result: SentenceResult; mock?: boolean; event: PracticeEvent } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [flagged, setFlagged] = useState(false);

  async function submit() {
    if (!text.trim() || !take) return;
    setBusy(true); setError('');
    try {
      const r = await correctSpeech(text.trim(), promptText);
      const event = await logEvent({ skill: 'speak', kind: 'free', durationSec: take.seconds, countsAsPractice: true,
        metrics: { mode: 'free', speakSec: take.seconds, corrections: r.result.corrections.length, mock: !!r.mock }, errorTags: r.result.error_tags });
      setResult({ ...r, event });
    } catch (e) { setError(e instanceof ApiError ? e.message : 'Có lỗi, thử lại nhé.'); }
    finally { setBusy(false); }
  }

  const reset = () => { setTake(null); setText(''); setResult(null); setFlagged(false); setPromptText(FREE_PROMPTS[Math.floor(Math.random() * FREE_PROMPTS.length)]); };

  return (
    <>
      <Card title="Đề bài">
        <p className="text-lg">{promptText}</p>
        <p className="mt-1 text-sm text-muted">Nói tiếng Trung khoảng 20–60 giây.</p>
      </Card>
      {!take && <RecordButton onTake={t => { setTake(t); setText(t.text); }} onLive={setText} />}
      {!take && text && <p className="han text-center text-lg text-muted">{text}</p>}
      {take && !result && (
        <Card title={RECOGNITION_OK ? 'Máy nghe được (sửa nếu máy nghe nhầm)' : 'Gõ lại điều bạn vừa nói'}>
          {take.error && <p className="mb-2 text-sm text-bad">{take.error}</p>}
          <textarea value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={600}
            className="han w-full rounded-xl border border-line bg-bg p-3 text-lg outline-none focus:border-accent"
            placeholder={RECOGNITION_OK ? 'Máy không nghe ra gì' : 'Gõ bằng chữ Hán hoặc pinyin, AI sẽ sửa'} />
          {!RECOGNITION_OK && <p className="mt-1 text-xs text-muted">Trình duyệt này không chuyển giọng nói thành chữ được, nên bạn gõ lại để AI sửa. Mở bằng Chrome để máy tự nghe.</p>}
          {take.audioUrl && <audio className="mt-2 w-full" controls src={take.audioUrl} aria-label="Bản ghi của tôi" />}
          {error && <p className="mt-2 text-sm text-bad">{error}</p>}
          <Button variant="primary" className="mt-3 w-full" disabled={!text.trim() || busy} onClick={submit}>{busy ? 'Đang sửa…' : 'Sửa giúp tôi'}</Button>
          <Button variant="ghost" className="w-full" onClick={reset}>Nói lại từ đầu</Button>
        </Card>
      )}
      {result && (
        <>
          <CorrectionCard original={text} result={result.result} mock={result.mock} />
          <Button variant="primary" onClick={() => onShadow({ zh: result.result.hanzi, py: result.result.pinyin, vi: result.result.meaning, from: 'Bản đã sửa' })}>
            Nói lại bản đã sửa
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button onClick={reset}>Đề khác</Button>
            <Button disabled={flagged} onClick={async () => { await flagWrong(result.event, prompt('Sai ở đâu? (không bắt buộc)') ?? ''); setFlagged(true); }}>
              {flagged ? 'Đã ghi nhận' : 'Kết quả này sai'}
            </Button>
          </div>
        </>
      )}
    </>
  );
}
