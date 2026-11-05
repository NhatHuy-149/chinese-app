import { useEffect, useState } from 'react';
import { BackButton, Badge, Button, Card, Empty, Screen, Segmented } from '../../ui/kit';
import { CorrectionCard, DiffText } from '../../ui/Correction';
import { ApiError, checkSentence, type SentenceResult } from '../../lib/api';
import { diffChars, sameZh } from '../../lib/compare';
import { flagWrong, logEvent, type PracticeEvent } from '../../lib/events';
import { saveSentence } from '../../lib/sentences';
import { allCards, answer } from '../../lib/vocab';
import { loadAllWords, type Word } from '../../lib/words';
import { useData, useStopwatch } from '../../lib/hooks';
import { back, go, useRoute } from '../../lib/route';
import { todayNum } from '../../lib/day';
import { db } from '../../lib/storage';
import type { SavedSentence } from '../../lib/sentences';
import type { Card as SrsCard } from '../../lib/srs';

const TAG_HINTS: Record<string, string> = {
  'lượng từ': 'có lượng từ (个, 本, 件, 杯…)',
  'trật tự từ': 'có thời gian và địa điểm (ví dụ: hôm qua tôi ở nhà…)',
  '了/过': 'kể một việc đã làm, dùng 了 hoặc 过',
  'từ nối': 'nối hai ý bằng 因为…所以…, 但是, 然后…',
  'dùng từ': 'dùng một từ bạn mới học',
  'thanh điệu': 'dùng các từ dễ nhầm thanh (妈/马, 买/卖…)',
  'số và ngày tháng': 'có ngày tháng, giờ hoặc giá tiền',
  'khác': 'về một việc hôm nay của bạn',
};

/** Two words the learner is currently studying (or common words if nothing is studied yet). */
async function pickPromptWords(): Promise<Word[]> {
  const [cards, all] = await Promise.all([allCards(), loadAllWords()]);
  const studied = [...new Set(cards.filter(c => c.dir !== 'sentence').map(c => c.wordId))].map(id => all.get(id)).filter(Boolean) as Word[];
  const pool = (studied.length >= 4 ? studied : [...all.values()].filter(w => w.freqRank < 300)).filter(w => !w.phrase && [...w.hanzi].length <= 3);
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 2);
}

export default function Write() {
  const [view, arg] = useRoute();
  if (view === 'review') return <Screen title="Ôn câu đã lưu"><BackButton onClick={back} /><SentenceReview /></Screen>;
  return <Practice focusTag={view === 'tag' ? arg : undefined} />;
}

type Phase = { step: 'input' } | { step: 'result'; input: string; result: SentenceResult; mock?: boolean };

function Practice({ focusTag }: { focusTag?: string }) {
  const [mode, setMode] = useState<'prompt' | 'free'>('prompt');
  const [words, setWords] = useState<Word[]>([]);
  const [text, setText] = useState('');
  const [phase, setPhase] = useState<Phase>({ step: 'input' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const dueSentences = useData(async () => (await allCards()).filter(c => c.dir === 'sentence' && c.due <= todayNum()).length);
  const watch = useStopwatch();

  const newPrompt = () => { pickPromptWords().then(setWords); };
  useEffect(newPrompt, []);

  async function submit() {
    if (!text.trim() || busy) return;
    setBusy(true); setError('');
    try {
      const { result, mock } = await checkSentence(text.trim(), mode === 'prompt' ? words.map(w => w.hanzi) : undefined, focusTag);
      setPhase({ step: 'result', input: text.trim(), result, mock });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Có lỗi, thử lại nhé.');
    } finally { setBusy(false); }
  }

  const restart = () => { setText(''); setPhase({ step: 'input' }); watch.reset(); newPrompt(); };

  return (
    <Screen title="Viết">
      {focusTag && <Card><Badge tone="accent">Luyện lỗi: {focusTag}</Badge><p className="mt-2 text-sm">Viết 1 câu {TAG_HINTS[focusTag] ?? ''}.</p></Card>}
      {phase.step === 'input' && (
        <>
          {!focusTag && <Segmented value={mode} onChange={setMode} options={[{ value: 'prompt', label: 'Theo đề' }, { value: 'free', label: 'Tự do' }]} />}
          {!focusTag && mode === 'prompt' && (
            <Card title="Đề bài">
              <p>Viết 1 câu dùng các từ:</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {words.map(w => <span key={w.id} className="rounded-lg border border-line px-3 py-1"><span className="han text-xl">{w.hanzi}</span> <span className="text-sm text-link">{w.pinyin}</span> <span className="text-sm text-muted">{w.vi}</span></span>)}
              </div>
              <Button variant="ghost" className="mt-1" onClick={newPrompt}>Đổi từ khác</Button>
            </Card>
          )}
          <Card>
            <label className="text-sm text-muted" htmlFor="write-input">Câu của bạn (được trộn tiếng Việt, pinyin, chữ Hán)</label>
            <textarea id="write-input" value={text} onChange={e => setText(e.target.value)} rows={3} maxLength={300}
              onKeyDown={e => { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') submit(); }}
              className="han mt-2 w-full rounded-xl border border-line bg-bg p-3 text-lg outline-none focus:border-accent"
              placeholder="Ví dụ: 我昨天 mua 一个书" />
            {error && <p className="mt-2 text-sm text-bad">{error}</p>}
          </Card>
          <Button variant="primary" onClick={submit} disabled={!text.trim() || busy}>{busy ? 'Đang sửa…' : 'Sửa câu'}</Button>
          <Button onClick={() => go('write/review')}>Ôn câu đã lưu{dueSentences ? ` · ${dueSentences} câu đến hạn` : ''}</Button>
        </>
      )}
      {phase.step === 'result' && <ResultFlow {...phase} focusTag={focusTag} seconds={watch.seconds} onNext={restart} />}
    </Screen>
  );
}

function ResultFlow({ input, result, mock, seconds, onNext }: {
  input: string; result: SentenceResult; mock?: boolean; focusTag?: string; seconds: () => number; onNext: () => void;
}) {
  const [retype, setRetype] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [done, setDone] = useState<PracticeEvent | null>(null);
  const [saved, setSaved] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [hint, setHint] = useState('');
  const diff = attempts > 0 && !done ? diffChars(result.hanzi, retype) : null;

  const record = (retypeDone: boolean, retypeOk: boolean) => logEvent({
    skill: 'write', kind: 'check', durationSec: seconds(), countsAsPractice: true,
    metrics: { firstTryCorrect: result.is_correct && result.corrections.length === 0, corrections: result.corrections.length, retypeOk, retypeDone, mock: !!mock },
    errorTags: result.error_tags,
  });

  async function checkRetype() {
    const n = attempts + 1;
    setAttempts(n);
    if (sameZh(result.hanzi, retype)) { setDone(await record(true, n === 1)); setHint(''); }
    else setHint('Chưa khớp. Chữ gạch chân là chỗ còn thiếu hoặc sai.');
  }

  return (
    <>
      <CorrectionCard original={input} result={result} mock={mock} />
      <Card title="Gõ lại câu đã sửa">
        {!done ? (
          <>
            <input value={retype} onChange={e => setRetype(e.target.value)} autoComplete="off" spellCheck={false}
              onPaste={e => e.preventDefault()} onDrop={e => e.preventDefault()}
              onKeyDown={e => { if (e.key === 'Enter') checkRetype(); }}
              className="han w-full rounded-xl border border-line bg-bg p-3 text-xl outline-none focus:border-accent"
              placeholder="Gõ lại (không dán được)" aria-label="Gõ lại câu đã sửa" />
            {diff && <p className="mt-2 text-xl"><DiffText parts={diff.parts} /></p>}
            {hint && <p className="mt-1 text-sm text-bad">{hint}</p>}
            <Button variant="primary" className="mt-3 w-full" onClick={checkRetype} disabled={!retype.trim()}>Kiểm tra</Button>
          </>
        ) : <p className="text-ok">Đúng rồi. Hoàn thành câu này{attempts === 1 ? ' ngay lần gõ đầu' : ` sau ${attempts} lần gõ`}.</p>}
      </Card>
      <div className="grid grid-cols-2 gap-3">
        <Button disabled={saved} onClick={async () => {
          await saveSentence({ hanzi: result.hanzi, pinyin: result.pinyin, meaning: result.meaning, input, corrections: result.corrections, source: 'write' });
          setSaved(true);
        }}>{saved ? 'Đã lưu' : 'Lưu câu'}</Button>
        <Button disabled={flagged} onClick={async () => {
          const note = prompt('Kết quả sai ở đâu? (không bắt buộc)') ?? '';
          const target = done ?? await record(false, false);
          await flagWrong(target, note);
          setFlagged(true);
          if (!done) setDone(target);
        }}>{flagged ? 'Đã ghi nhận' : 'Kết quả này sai'}</Button>
      </div>
      {done && <Button variant="primary" onClick={onNext}>Câu tiếp theo</Button>}
    </>
  );
}

/** Saved sentences: Vietnamese shown, learner types the Chinese. */
function SentenceReview() {
  const [queue, setQueue] = useState<Array<{ card: SrsCard; s: SavedSentence }>>();
  const [typed, setTyped] = useState('');
  const [checked, setChecked] = useState<null | boolean>(null);
  const watch = useStopwatch();

  useEffect(() => {
    (async () => {
      const d = await db();
      const [cards, sentences] = await Promise.all([d.getAll('srs'), d.getAll('sentences')]);
      const byId = new Map(sentences.map(s => [s.id, s]));
      setQueue(cards.filter(c => c.dir === 'sentence' && c.due <= todayNum() && byId.has(c.wordId)).map(card => ({ card, s: byId.get(card.wordId)! })));
    })();
  }, []);

  if (!queue) return null;
  const item = queue[0];
  if (!item) return <Empty>Không có câu nào đến hạn ôn. Lưu thêm câu ở phần Viết.</Empty>;

  const ok = checked === true;
  async function next(correct: boolean) {
    await answer(item.card, correct, watch.seconds());
    setTyped(''); setChecked(null); watch.reset();
    setQueue(q => q!.slice(1));
  }

  return (
    <>
      <Card title={`Còn ${queue.length} câu`}>
        <p className="text-xl">{item.s.meaning}</p>
        <input value={typed} onChange={e => setTyped(e.target.value)} onPaste={e => e.preventDefault()} autoComplete="off"
          onKeyDown={e => { if (e.key === 'Enter' && checked === null) setChecked(sameZh(item.s.hanzi, typed)); }}
          className="han mt-3 w-full rounded-xl border border-line bg-bg p-3 text-xl outline-none focus:border-accent"
          placeholder="Gõ câu tiếng Trung" aria-label="Câu tiếng Trung" disabled={checked !== null} />
        {checked !== null && (
          <div className="mt-3">
            <p className={ok ? 'text-ok' : 'text-bad'}>{ok ? 'Đúng' : 'Chưa đúng. Câu đúng:'}</p>
            <p className="text-xl"><DiffText parts={diffChars(item.s.hanzi, typed).parts} /></p>
            <p className="text-link">{item.s.pinyin}</p>
          </div>
        )}
      </Card>
      {checked === null
        ? <Button variant="primary" onClick={() => setChecked(sameZh(item.s.hanzi, typed))}>Kiểm tra</Button>
        : <Button variant="primary" onClick={() => next(ok)}>Tiếp</Button>}
    </>
  );
}
