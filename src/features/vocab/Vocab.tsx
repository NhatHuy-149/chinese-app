import { useMemo, useState } from 'react';
import { BackButton, Badge, Button, Card, Icon, ProgressBar, Screen } from '../../ui/kit';
import { useData } from '../../lib/hooks';
import { back, go, useRoute } from '../../lib/route';
import { allCards, cardsByWord, masteredIds, prioritiseTopic, todayPlan, wordStatus } from '../../lib/vocab';
import { loadAllWords, loadIndex, type Word } from '../../lib/words';
import WordDetail from './WordDetail';
import Review from './Review';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd');

export default function Vocab() {
  const route = useRoute();
  const [view, arg1, arg2] = route;
  if (view === 'review') return <Screen title="Ôn từ vựng"><BackButton onClick={back} /><Review onDone={back} /></Screen>;
  if (view === 'set') return <Screen title="Học bộ từ"><BackButton onClick={back} /><Review set={{ topic: arg1, index: Number(arg2) }} onDone={back} /></Screen>;
  if (view === 'topic') return <TopicView id={arg1} />;
  if (view === 'word') return <WordView id={arg1} />;
  return <Home />;
}

function Home() {
  const idx = useData(loadIndex);
  const cards = useData(allCards);
  const plan = useData(todayPlan);
  const [q, setQ] = useState('');
  const mastered = cards ? masteredIds(cards) : new Set<string>();
  const byWord = cards ? cardsByWord(cards) : new Map();

  const topicMastered = useData(async () => {
    const all = await loadAllWords();
    const m = new Map<string, number>();
    for (const id of mastered) { const w = all.get(id); if (w) m.set(w.topic, (m.get(w.topic) ?? 0) + 1); }
    return m;
  }, [cards?.length, mastered.size]);

  const reviewCount = plan ? plan.due.length + plan.newWordIds.length * 2 : 0;
  return (
    <Screen title="Từ vựng">
      <Card>
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-sm text-muted">Đã thuộc</span>
          <span><b className="text-2xl">{mastered.size}</b> <span className="text-muted">/ {idx?.total ?? '…'} từ</span></span>
        </div>
        <ProgressBar value={mastered.size} max={idx?.total ?? 1} label="Số từ đã thuộc" />
        <p className="mt-2 text-xs text-muted">"Thuộc" = nhớ được ở cả hai chiều qua nhiều lần ôn cách nhau (khoảng cách ôn từ 8 ngày trở lên).</p>
      </Card>
      <Button variant="primary" onClick={() => go('vocab/review')} disabled={!plan}>
        Ôn hôm nay · {reviewCount} thẻ{plan?.newWordIds.length ? ` (${plan.newWordIds.length} từ mới)` : ''}
      </Button>
      <label className="flex items-center gap-2 rounded-xl border border-line bg-card px-3">
        <Icon name="search" className="text-muted" />
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Tìm chữ Hán, pinyin hoặc nghĩa"
          className="min-h-[44px] flex-1 bg-transparent outline-none placeholder:text-muted" />
      </label>
      {q.trim() ? <SearchResults q={q} byWord={byWord} /> : (
        <Card title="Chủ đề">
          <ul className="flex flex-col">
            {idx?.topics.map(t => (
              <li key={t.id}>
                <a href={`#/vocab/topic/${t.id}`} className="flex min-h-[52px] flex-col justify-center gap-1 border-b border-line py-2 last:border-0">
                  <span className="flex justify-between text-sm"><span>{t.vi}</span><span className="text-muted">{topicMastered?.get(t.id) ?? 0}/{t.count}</span></span>
                  <ProgressBar value={topicMastered?.get(t.id) ?? 0} max={t.count} color="link" label={t.vi} />
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Screen>
  );
}

function SearchResults({ q, byWord }: { q: string; byWord: Map<string, import('../../lib/srs').Card[]> }) {
  const all = useData(loadAllWords);
  const hits = useMemo(() => {
    if (!all) return [];
    const n = norm(q.trim());
    return [...all.values()].filter(w => w.hanzi.includes(q.trim()) || norm(w.pinyin).replace(/\s/g, '').includes(n.replace(/\s/g, '')) || norm(w.vi).includes(n)).slice(0, 50);
  }, [all, q]);
  return (
    <Card title={`Kết quả (${hits.length})`}>
      <WordList words={hits} byWord={byWord} />
    </Card>
  );
}

const STATUS = { new: ['Chưa học', 'muted'], learning: ['Đang học', 'link'], mastered: ['Đã thuộc', 'ok'] } as const;

function WordList({ words, byWord }: { words: Word[]; byWord: Map<string, import('../../lib/srs').Card[]> }) {
  return (
    <ul className="flex flex-col">
      {words.map(w => {
        const [label, tone] = STATUS[wordStatus(byWord.get(w.id))];
        return (
          <li key={w.id}>
            <a href={`#/vocab/word/${encodeURIComponent(w.id)}`} className="flex min-h-[52px] items-center gap-3 border-b border-line py-2 last:border-0">
              <span className="han w-20 shrink-0 text-xl">{w.hanzi}</span>
              <span className="flex-1 text-sm"><span className="text-link">{w.pinyin}</span><br /><span className="text-muted">{w.vi}</span></span>
              <Badge tone={tone}>{label}</Badge>
            </a>
          </li>
        );
      })}
    </ul>
  );
}

function TopicView({ id }: { id: string }) {
  const idx = useData(loadIndex);
  const all = useData(loadAllWords);
  const cards = useData(allCards);
  const topic = idx?.topics.find(t => t.id === id);
  const byWord = cards ? cardsByWord(cards) : new Map();
  if (!topic || !all) return <Screen title="Chủ đề"><BackButton onClick={back} /></Screen>;
  return (
    <Screen title={topic.vi}>
      <BackButton onClick={back} />
      <Button onClick={() => prioritiseTopic(id)}>Ưu tiên lấy từ mới từ chủ đề này</Button>
      {topic.sets.map((set, i) => {
        const words = set.map(wid => all.get(wid)!).filter(Boolean);
        const done = words.filter(w => wordStatus(byWord.get(w.id)) === 'mastered').length;
        return (
          <Card key={i} title={`Bộ ${i + 1} · ${done}/${words.length} đã thuộc`}>
            <WordList words={words} byWord={byWord} />
            <Button variant="primary" className="mt-3 w-full" onClick={() => go(`vocab/set/${id}/${i}`)}>Học bộ này</Button>
          </Card>
        );
      })}
    </Screen>
  );
}

function WordView({ id }: { id: string }) {
  const all = useData(loadAllWords);
  const word = all?.get(id);
  return (
    <Screen title="Thẻ từ">
      <BackButton onClick={back} />
      {word ? <WordDetail word={word} /> : <p className="text-muted">Đang tải…</p>}
    </Screen>
  );
}
