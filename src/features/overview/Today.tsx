import { Button, Card, Empty, ProgressBar } from '../../ui/kit';
import { go } from '../../lib/route';
import { useSettings } from '../../lib/settings';
import type { PracticeEvent } from '../../lib/events';
import { errorTrends, eventsBetween, eventsOnDay, practiceDays, totalsFor, weeklySummary } from '../../lib/stats';
import { todayNum, weekStartNum } from '../../lib/day';

const ROWS = [
  { key: 'vocab', label: 'Ôn từ vựng', unit: 'thẻ', path: 'vocab/review', verb: (n: number) => `ôn ${n} thẻ nữa` },
  { key: 'write', label: 'Viết câu', unit: 'câu', path: 'write', verb: (n: number) => `viết ${n} câu nữa` },
  { key: 'speak', label: 'Nói', unit: 'câu', path: 'speak', verb: (n: number) => `nói ${n} câu nữa` },
  { key: 'listen', label: 'Nghe', unit: 'đoạn', path: 'listen', verb: (n: number) => `nghe ${n} đoạn nữa` },
] as const;

export default function Today({ events }: { events: PracticeEvent[] }) {
  const settings = useSettings();
  const today = todayNum();
  const t = totalsFor(eventsOnDay(events, today));
  if (!settings) return null;
  const goals = settings.goals;
  const next = ROWS.find(r => t[r.key] < goals[r.key]);

  const weekStart = weekStartNum(today);
  const weekEvents = eventsBetween(events, weekStart, today);
  const weekDays = [...practiceDays(weekEvents)].length;
  const week = totalsFor(weekEvents);
  const errors = errorTrends(events, today - 29, today, 5);
  const summary = weeklySummary(events, today);

  return (
    <>
      <Card title="Mục tiêu hôm nay">
        <ul className="flex flex-col gap-3">
          {ROWS.map(r => {
            const done = t[r.key] >= goals[r.key];
            return (
              <li key={r.key}>
                <div className="mb-1 flex justify-between text-sm">
                  <span>{r.label}</span>
                  <span className={done ? 'font-semibold text-ok' : 'text-muted'}>{done ? 'Xong · ' : ''}{t[r.key]}/{goals[r.key]} {r.unit}</span>
                </div>
                <ProgressBar value={t[r.key]} max={goals[r.key]} color={done ? 'ok' : 'accent'} label={r.label} />
              </li>
            );
          })}
        </ul>
      </Card>
      {next
        ? <Button variant="primary" onClick={() => go(next.path)}>Bắt đầu: {next.verb(goals[next.key] - t[next.key])}</Button>
        : <Button variant="primary" onClick={() => go('vocab')}>Đã đủ mục tiêu hôm nay. Luyện thêm?</Button>}

      <Card title="Tuần này">
        <p className="text-sm">Đã luyện <b>{weekDays}</b> ngày · {Math.round(week.minutes)} phút · {week.vocab} thẻ · {week.write} câu viết · {week.speak} câu nói · {week.listen} đoạn nghe.</p>
      </Card>

      <Card title="Lỗi hay gặp (30 ngày)">
        {errors.length === 0 ? <Empty>Chưa có lỗi nào được ghi lại. Luyện Viết hoặc Nói để app ghi nhận lỗi.</Empty> : (
          <ul className="flex flex-col">
            {errors.slice(0, 5).map(e => (
              <li key={e.tag} className="flex min-h-[48px] items-center justify-between border-b border-line last:border-0">
                <span>{e.tag} <span className="text-sm text-muted">· {e.count} lần</span></span>
                <Button variant="ghost" onClick={() => go(`write/tag/${e.tag}`)}>Luyện</Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {summary && (
        <Card title="Tóm tắt tuần trước">
          <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">{summary.map((l, i) => <li key={i}>{l}</li>)}</ul>
        </Card>
      )}
    </>
  );
}
