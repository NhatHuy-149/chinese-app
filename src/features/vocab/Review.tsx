import { useEffect, useState } from 'react';
import { Badge, Button, Card, Empty, Icon, ProgressBar } from '../../ui/kit';
import { allCards, answer, introduce, todayPlan } from '../../lib/vocab';
import { loadAllWords, loadIndex, type Word } from '../../lib/words';
import { speak } from '../../lib/tts';
import { todayNum } from '../../lib/day';
import { useStopwatch } from '../../lib/hooks';
import type { Card as SrsCard } from '../../lib/srs';

type Session = { queue: SrsCard[]; words: Map<string, Word>; total: number; capped: boolean };

/** Loads today's queue, or only the cards of one study set when `set` is given. */
async function buildSession(set?: { topic: string; index: number }): Promise<Session> {
  const words = await loadAllWords();
  if (set) {
    const idx = await loadIndex();
    const ids = idx.topics.find(t => t.id === set.topic)?.sets[set.index] ?? [];
    const cards = await allCards();
    const known = new Set(cards.map(c => c.wordId));
    const fresh = await introduce(ids.filter(id => !known.has(id)));
    const due = cards.filter(c => ids.includes(c.wordId) && c.dir !== 'sentence' && c.due <= todayNum());
    const queue = order([...due, ...fresh]);
    return { queue, words, total: queue.length, capped: false };
  }
  const plan = await todayPlan();
  const fresh = await introduce(plan.newWordIds);
  const queue = order([...plan.due, ...fresh]);
  return { queue, words, total: queue.length, capped: plan.capped };
}

/** Recognition (zh→vi) before production (vi→zh) for the same word. */
const order = (cards: SrsCard[]) => [...cards.filter(c => c.dir === 'zh2vi'), ...cards.filter(c => c.dir === 'vi2zh')];

export default function Review({ set, onDone }: { set?: { topic: string; index: number }; onDone: () => void }) {
  const [s, setS] = useState<Session>();
  const [revealed, setRevealed] = useState(false);
  const [stats, setStats] = useState({ right: 0, wrong: 0 });
  const watch = useStopwatch();

  useEffect(() => { buildSession(set).then(setS); }, [set?.topic, set?.index]);

  const card = s?.queue[0];
  const word = card ? s!.words.get(card.wordId) : undefined;

  useEffect(() => {
    setRevealed(false);
    watch.reset();
    if (card?.dir === 'zh2vi' && word) speak(word.hanzi);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [card?.id, s?.queue.length]);

  async function grade(correct: boolean) {
    if (!card || !s) return;
    const updated = await answer(card, correct, watch.seconds());
    setStats(st => ({ right: st.right + (correct ? 1 : 0), wrong: st.wrong + (correct ? 0 : 1) }));
    // a forgotten card comes back at the end of today's session
    setS({ ...s, queue: correct ? s.queue.slice(1) : [...s.queue.slice(1), updated] });
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!card) return;
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setRevealed(true); }
      else if (revealed && e.key === '1') grade(false);
      else if (revealed && e.key === '2') grade(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!s) return <p className="text-muted">Đang chuẩn bị thẻ…</p>;
  if (!card || !word) {
    return (
      <Card title="Xong phiên ôn">
        {s.total === 0
          ? <Empty>{set ? 'Bộ này không còn thẻ đến hạn hôm nay.' : 'Hôm nay không còn thẻ nào. Quay lại ngày mai nhé.'}</Empty>
          : <p>Đã ôn {stats.right + stats.wrong} lượt: nhớ {stats.right}, chưa nhớ {stats.wrong}.</p>}
        {s.capped && <p className="mt-2 text-sm text-muted">Số thẻ tồn đã chạm trần nên hôm nay không thêm từ mới.</p>}
        <Button variant="primary" className="mt-4 w-full" onClick={onDone}>Xong</Button>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3 text-sm text-muted">
        <ProgressBar value={s.total - s.queue.length} max={s.total} label="Tiến độ phiên ôn" />
        <span className="whitespace-nowrap">còn {s.queue.length}</span>
      </div>
      <Card>
        <div className="mb-2 flex gap-2">
          <Badge tone="muted">{card.dir === 'zh2vi' ? 'Trung → Việt' : 'Việt → Trung'}</Badge>
          {card.reps === 0 && <Badge tone="accent">Từ mới</Badge>}
        </div>
        <div className="flex min-h-[180px] flex-col items-center justify-center gap-2 text-center">
          {card.dir === 'zh2vi'
            ? <>
                <div className="han text-6xl font-bold">{word.hanzi}</div>
                <Button aria-label="Nghe lại" onClick={() => speak(word.hanzi)}><Icon name="play" /></Button>
              </>
            : <div className="text-2xl">{word.vi}</div>}
          {revealed && (
            <div className="mt-3 flex flex-col items-center gap-1 border-t border-line pt-3">
              {card.dir === 'vi2zh' && <div className="han text-5xl font-bold">{word.hanzi}</div>}
              <div className="text-lg text-link">{word.pinyin}</div>
              {card.dir === 'zh2vi' && <div className="text-xl">{word.vi}</div>}
              {word.example && <div className="mt-2 text-sm text-muted"><span className="han text-base text-ink">{word.example.zh}</span><br />{word.example.vi}</div>}
            </div>
          )}
        </div>
      </Card>
      {!revealed
        ? <Button variant="primary" onClick={() => { setRevealed(true); if (card.dir === 'vi2zh') speak(word.hanzi); }}>Hiện đáp án</Button>
        : <div className="grid grid-cols-2 gap-3">
            <Button className="min-h-[52px] border-bad/60 text-bad" onClick={() => grade(false)}><span className="inline-flex items-center gap-1"><Icon name="x" /> Chưa nhớ</span></Button>
            <Button className="min-h-[52px] border-ok/60 text-ok" onClick={() => grade(true)}><span className="inline-flex items-center gap-1"><Icon name="check" /> Nhớ</span></Button>
          </div>}
      <p className="text-center text-xs text-muted">Bàn phím: Space để hiện đáp án, 1 = chưa nhớ, 2 = nhớ.</p>
    </div>
  );
}
