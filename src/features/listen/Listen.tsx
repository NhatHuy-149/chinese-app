import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, Icon, Screen, Segmented } from '../../ui/kit';
import { MockBadge } from '../../ui/Correction';
import { speak, stopSpeaking } from '../../lib/tts';
import { ApiError, generatePassage, gradeSummary, type GradeResult } from '../../lib/api';
import { flagWrong, logEvent, type PracticeEvent } from '../../lib/events';
import { allCards, introduce, masteredIds } from '../../lib/vocab';
import { loadAllWords, loadIndex, type Word } from '../../lib/words';
import { kvGet, kvSet } from '../../lib/storage';
import { useData, useStopwatch } from '../../lib/hooks';

type Sentence = { zh: string; py: string; vi: string };
type Passage = { id: string; title: string; sentences: Sentence[]; keyPoints: string[]; source: 'ai' | 'offline'; level: string; mock?: boolean };
type Level = 'A1' | 'A2' | 'B1';

const MAX_REPLAYS = 3;
const levelFor = (mastered: number): Level => (mastered < 300 ? 'A1' : mastered < 1000 ? 'A2' : 'B1');

async function offlinePassage(): Promise<Passage> {
  const list = await fetch('/data/paragraphs.json').then(r => r.json()) as Array<{ id: string; title: string; sentences: Sentence[]; keyPoints: string[] }>;
  const used = await kvGet<string[]>('listenUsedOffline', []);
  const fresh = list.filter(p => p.keyPoints.length && !used.includes(p.id));
  const pick = (fresh.length ? fresh : list)[Math.floor(Math.random() * (fresh.length || list.length))];
  return { ...pick, source: 'offline', level: '—' };
}

/** Words of the passage the learner has not started yet (longest match first). */
function newWordsIn(text: string, words: Map<string, Word>, known: Set<string>): Word[] {
  const found: Word[] = [];
  const candidates = [...words.values()].filter(w => [...w.hanzi].length >= 2 || !w.phrase).sort((a, b) => b.hanzi.length - a.hanzi.length);
  let rest = text;
  for (const w of candidates) {
    if (rest.includes(w.hanzi)) {
      if (!known.has(w.id)) found.push(w);
      rest = rest.split(w.hanzi).join('　');
    }
  }
  return found.slice(0, 10);
}

export default function Listen() {
  const cards = useData(allCards);
  const idx = useData(loadIndex);
  const mastered = cards ? masteredIds(cards).size : 0;
  const [level, setLevel] = useState<Level | null>(null);
  const [topic, setTopic] = useState('');
  const [passage, setPassage] = useState<Passage | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const effectiveLevel = level ?? levelFor(mastered);

  async function startAi() {
    setBusy(true); setError('');
    try {
      const [words, cs] = await Promise.all([loadAllWords(), allCards()]);
      const known = [...new Set(cs.filter(c => c.dir !== 'sentence').map(c => c.wordId))].map(id => words.get(id)?.hanzi).filter(Boolean) as string[];
      const topicName = topic || idx?.topics[Math.floor(Math.random() * idx.topics.length)].vi || 'Sinh hoạt hằng ngày';
      const { result, mock } = await generatePassage(effectiveLevel, topicName, known.slice(0, 400));
      const p: Passage = { id: `ai-${Date.now()}`, title: result.title, sentences: result.sentences, keyPoints: result.key_points, source: 'ai', level: effectiveLevel, mock: !!mock };
      await kvSet('listenLast', p);
      setPassage(p);
    } catch (e) {
      setError(e instanceof ApiError ? `${e.message} Bạn có thể dùng đoạn có sẵn bên dưới.` : 'Không tạo được đoạn nghe.');
    } finally { setBusy(false); }
  }

  if (passage) return <Screen title="Nghe"><Session passage={passage} onDone={() => setPassage(null)} /></Screen>;

  return (
    <Screen title="Nghe">
      <Card title="Nghe tóm tắt ý">
        <p className="text-sm text-muted">Nghe một đoạn ngắn không có chữ, rồi viết lại ý chính bằng tiếng Việt. Tối đa {MAX_REPLAYS} lần nghe lại trước khi chấm.</p>
        <p className="mt-3 text-sm">Mức độ (tự chọn theo {mastered} từ đã thuộc):</p>
        <div className="mt-1"><Segmented value={effectiveLevel} onChange={v => setLevel(v)} options={[{ value: 'A1', label: 'Rất dễ' }, { value: 'A2', label: 'Dễ' }, { value: 'B1', label: 'Trung bình' }]} /></div>
        <label className="mt-3 block text-sm" htmlFor="listen-topic">Chủ đề</label>
        <select id="listen-topic" value={topic} onChange={e => setTopic(e.target.value)}
          className="mt-1 min-h-[44px] w-full rounded-xl border border-line bg-bg px-3">
          <option value="">Để app chọn</option>
          {idx?.topics.map(t => <option key={t.id} value={t.vi}>{t.vi}</option>)}
        </select>
      </Card>
      {error && <p className="text-sm text-bad">{error}</p>}
      <Button variant="primary" onClick={startAi} disabled={busy}>{busy ? 'Đang tạo đoạn nghe…' : 'Bắt đầu (AI tạo đoạn mới)'}</Button>
      <Button onClick={async () => setPassage(await offlinePassage())}>Dùng đoạn có sẵn (không cần mạng)</Button>
    </Screen>
  );
}

function Session({ passage, onDone }: { passage: Passage; onDone: () => void }) {
  const [plays, setPlays] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState<'0.8' | '1'>('1');
  const [summary, setSummary] = useState('');
  const [grade, setGrade] = useState<(GradeResult & { selfGraded?: boolean; mock?: boolean }) | null>(null);
  const [selfCheck, setSelfCheck] = useState<boolean[] | null>(null);
  const [event, setEvent] = useState<PracticeEvent | null>(null);
  const [reveal, setReveal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [added, setAdded] = useState(0);
  const [flagged, setFlagged] = useState(false);
  const watch = useStopwatch();
  const text = passage.sentences.map(s => s.zh).join('');
  const playsLeft = MAX_REPLAYS + 1 - plays;

  useEffect(() => () => stopSpeaking(), []);
  const words = useData(loadAllWords);
  const cards = useData(allCards);
  const unknown = useMemo(() => (words && cards ? newWordsIn(text, words, new Set(cards.map(c => c.wordId))) : []), [words, cards, text]);

  async function play() {
    if (playsLeft <= 0 && !grade) return;
    setPlays(p => p + 1); setPlaying(true);
    for (const s of passage.sentences) await speak(s.zh, Number(rate));
    setPlaying(false);
  }

  async function finish(result: GradeResult & { selfGraded?: boolean; mock?: boolean }) {
    setGrade(result);
    const e = await logEvent({
      skill: 'listen', kind: 'gist', itemId: passage.id, durationSec: watch.seconds(), countsAsPractice: true,
      metrics: { score: result.score, caught: result.caught.length, total: passage.keyPoints.length, replays: Math.max(0, plays - 1), level: passage.level, source: passage.source, selfGraded: !!result.selfGraded, mock: !!result.mock },
    });
    setEvent(e);
    if (passage.source === 'offline') await kvSet('listenUsedOffline', [...await kvGet<string[]>('listenUsedOffline', []), passage.id]);
  }

  async function gradeAi() {
    setBusy(true); setError('');
    try {
      const { result, mock } = await gradeSummary(text, passage.keyPoints, summary.trim());
      await finish({ ...result, mock });
    } catch (e) {
      setError(e instanceof ApiError ? `${e.message} Bạn có thể tự chấm bên dưới.` : 'Không chấm được.');
    } finally { setBusy(false); }
  }

  function finishSelf() {
    const caught = selfCheck!.flatMap((v, i) => (v ? [i] : []));
    const missed = selfCheck!.flatMap((v, i) => (v ? [] : [i]));
    finish({ score: Math.round((100 * caught.length) / passage.keyPoints.length), caught, missed, feedback: 'Bạn tự chấm bằng cách so với các ý chính.', selfGraded: true });
  }

  return (
    <>
      <Card>
        <div className="mb-2 flex flex-wrap gap-2">
          <Badge>{passage.source === 'ai' ? `Do AI tạo · mức ${passage.level}` : 'Đoạn có sẵn'}</Badge>
          {(grade?.mock || passage.mock) && <MockBadge />}
        </div>
        <div className="flex items-center gap-3">
          <button type="button" onClick={play} disabled={playing || (playsLeft <= 0 && !grade)} aria-label="Phát đoạn nghe"
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-accent text-bg"><Icon name="play" size={28} /></button>
          <div className="flex h-10 flex-1 items-center gap-1" aria-hidden="true">
            {Array.from({ length: 24 }, (_, i) => (
              <span key={i} className={`w-1 rounded-full bg-link ${playing ? 'animate-pulse' : 'opacity-40'}`} style={{ height: `${20 + ((i * 37) % 70)}%`, animationDelay: `${i * 60}ms` }} />
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <div className="flex-1"><Segmented value={rate} onChange={setRate} options={[{ value: '0.8', label: '0.8x' }, { value: '1', label: '1x' }]} /></div>
          <span className="text-sm text-muted">{grade ? 'Nghe thoải mái' : plays === 0 ? 'Chưa nghe' : `Còn ${Math.max(0, playsLeft)} lần nghe`}</span>
        </div>
      </Card>

      {!grade && (
        <Card title="Tóm tắt ý chính (tiếng Việt)">
          <textarea value={summary} onChange={e => setSummary(e.target.value)} rows={4} maxLength={600}
            className="w-full rounded-xl border border-line bg-bg p-3 outline-none focus:border-accent" placeholder="Đoạn này nói về…" />
          {error && <p className="mt-2 text-sm text-bad">{error}</p>}
          {passage.source === 'ai' && !selfCheck && (
            <Button variant="primary" className="mt-3 w-full" disabled={!summary.trim() || plays === 0 || busy} onClick={gradeAi}>{busy ? 'Đang chấm…' : 'Chấm điểm'}</Button>
          )}
          {!selfCheck && <Button variant={passage.source === 'ai' ? 'ghost' : 'primary'} className="mt-2 w-full" disabled={!summary.trim() || plays === 0}
            onClick={() => setSelfCheck(passage.keyPoints.map(() => false))}>Tự chấm theo ý chính</Button>}
          {selfCheck && (
            <div className="mt-3 flex flex-col gap-2">
              <p className="text-sm text-muted">Đánh dấu những ý bạn đã viết được:</p>
              {passage.keyPoints.map((k, i) => (
                <label key={i} className="flex min-h-[44px] items-center gap-3 rounded-xl border border-line px-3">
                  <input type="checkbox" checked={selfCheck[i]} onChange={e => setSelfCheck(s => s!.map((v, j) => (j === i ? e.target.checked : v)))} className="h-5 w-5" />
                  <span className="text-sm">{k}</span>
                </label>
              ))}
              <Button variant="primary" onClick={finishSelf}>Xong</Button>
            </div>
          )}
        </Card>
      )}

      {grade && (
        <Card title="Kết quả chấm">
          <p className="text-3xl font-bold">{grade.score}<span className="text-base text-muted">/100</span></p>
          {!grade.selfGraded && <p className="text-xs text-muted">Do AI chấm, có thể sai.</p>}
          <ul className="mt-3 flex flex-col gap-2">
            {passage.keyPoints.map((k, i) => {
              const ok = grade.caught.includes(i);
              return (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className={ok ? 'text-ok' : 'text-bad'}><Icon name={ok ? 'check' : 'x'} size={18} /></span>
                  <span><b className={ok ? 'text-ok' : 'text-bad'}>{ok ? 'Bắt được' : 'Bỏ sót'}:</b> {k}</span>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 text-sm">{grade.feedback}</p>
          <p className="mt-2 text-sm text-muted">Bạn viết: {summary}</p>
        </Card>
      )}

      {grade && (
        <>
          <Button onClick={() => setReveal(r => !r)}>{reveal ? 'Ẩn chữ Hán' : 'Xem chữ Hán và bản dịch'}</Button>
          {reveal && (
            <Card>
              {passage.sentences.map((s, i) => (
                <div key={i} className="border-b border-line py-2 last:border-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="han text-xl">{s.zh}</span>
                    <button type="button" aria-label="Nghe câu này" onClick={() => speak(s.zh, Number(rate))} className="min-h-[44px] px-2 text-link"><Icon name="play" /></button>
                  </div>
                  <div className="text-sm text-link">{s.py}</div>
                  <div className="text-sm text-muted">{s.vi}</div>
                </div>
              ))}
            </Card>
          )}
          {unknown.length > 0 && (
            <Button disabled={added > 0} onClick={async () => { await introduce(unknown.map(w => w.id)); setAdded(unknown.length); }}>
              {added ? `Đã thêm ${added} từ vào ôn` : `Thêm ${unknown.length} từ mới vào ôn (${unknown.map(w => w.hanzi).join('、')})`}
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            {!grade.selfGraded && event
              ? <Button disabled={flagged} onClick={async () => { await flagWrong(event, prompt('Chấm sai ở đâu? (không bắt buộc)') ?? ''); setFlagged(true); }}>{flagged ? 'Đã ghi nhận' : 'Chấm sai'}</Button>
              : <span />}
            <Button variant="primary" className="min-h-[44px]" onClick={onDone}>Đoạn khác</Button>
          </div>
        </>
      )}
    </>
  );
}
