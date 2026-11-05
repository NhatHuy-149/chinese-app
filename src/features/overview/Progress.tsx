import { useState } from 'react';
import { Button, Card, Empty, ProgressBar, Segmented } from '../../ui/kit';
import { Heatmap, MiniLine, StackedBars } from '../../ui/charts';
import type { PracticeEvent } from '../../lib/events';
import {
  attendance, errorTrends, eventsBetween, firstDay, forecast, heatmap, masteredAt, milestones, MIN_SAMPLES,
  quality, streaks, totalsFor, volume, weeklySummary,
} from '../../lib/stats';
import { formatDayVi, keyFromNum, todayNum } from '../../lib/day';
import { useData } from '../../lib/hooks';
import { loadAllWords, loadIndex } from '../../lib/words';
import { dailyCsv, download, exportBackup } from '../../lib/backup';

type Range = '7' | '30' | 'all';

export default function Progress({ events }: { events: PracticeEvent[] }) {
  const [range, setRange] = useState<Range>('30');
  const today = todayNum();
  const first = firstDay(events);
  const idx = useData(loadIndex);
  const words = useData(loadAllWords);

  if (first === null) {
    return (
      <>
        <Segmented value={range} onChange={setRange} options={[{ value: '7', label: '7 ngày' }, { value: '30', label: '30 ngày' }, { value: 'all', label: 'Từ đầu' }]} />
        <Empty>Chưa có lượt luyện nào. Số liệu ở đây được tính từ nhật ký luyện tập, bắt đầu từ lượt luyện đầu tiên của bạn.</Empty>
        <ExportCard />
      </>
    );
  }

  const from = range === '7' ? today - 6 : range === '30' ? today - 29 : first;
  const by = range === '7' ? 'day' : range === '30' ? (today - from > 20 ? 'week' : 'day') : 'week';
  const inRange = eventsBetween(events, from, today);
  const allTotals = totalsFor(events);
  const att = attendance(events, today);
  const st = streaks(events, today);
  const totalWords = idx?.total ?? 0;
  // event-sourced like every other number here (cards hold the same state, the log is the source of truth)
  const mastered = masteredAt(events, today);
  const fc = forecast(events, today, totalWords);
  const daysOfData = today - first + 1;

  const q = (m: Parameters<typeof quality>[1]) => quality(events, m, from, today, by);
  const errs = errorTrends(events, from, today);
  const ms = milestones(events, totalWords);
  const summary = weeklySummary(events, today);
  const masteredInRange = masteredAt(events, today).size - masteredAt(events, from - 1).size;

  const topicMastered = new Map<string, number>();
  if (words) for (const id of mastered) { const w = words.get(id); if (w) topicMastered.set(w.topic, (topicMastered.get(w.topic) ?? 0) + 1); }

  return (
    <>
      <Segmented value={range} onChange={setRange} options={[{ value: '7', label: '7 ngày' }, { value: '30', label: '30 ngày' }, { value: 'all', label: 'Từ đầu' }]} />

      <Card title="Tổng từ ngày đầu">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Stat label="Bắt đầu" value={formatDayVi(keyFromNum(first))} />
          <Stat label="Chuyên cần" value={`${att.practised}/${att.total} ngày`} />
          <Stat label="Chuỗi hiện tại" value={`${st.current} ngày`} />
          <Stat label="Chuỗi dài nhất" value={`${st.longest} ngày`} />
          <Stat label="Từ đã thuộc" value={`${mastered.size}/${totalWords}`} />
          <Stat label="Lượt ôn từ" value={allTotals.vocab} />
          <Stat label="Câu đã viết" value={allTotals.write} />
          <Stat label="Phút đã nói" value={Math.round(allTotals.speakSec / 60)} />
          <Stat label="Đoạn đã nghe" value={allTotals.listen} />
          <Stat label="Phút luyện (đo được)" value={Math.round(allTotals.minutes)} />
        </dl>
        {daysOfData < 7 && <p className="mt-3 text-xs text-muted">Mới có {daysOfData} ngày dữ liệu, các xu hướng bên dưới còn ít ý nghĩa.</p>}
      </Card>

      <Card title={`Khối lượng luyện tập (${by === 'day' ? 'theo ngày' : 'theo tuần'})`}>
        <StackedBars data={volume(events, from, today, by)} />
        <p className="mt-1 text-xs text-muted">Phút được đo từ lúc mở một bài đến lúc trả lời (mỗi lượt tính tối đa 5 phút).</p>
        <div className="mt-4"><Heatmap cells={heatmap(events, today, 16)} /></div>
      </Card>

      <Card title="Chất lượng theo thời gian">
        <div className="flex flex-col gap-3">
          <MiniLine title="Ôn từ: tỷ lệ nhớ" {...pick(q('vocabCorrect'))} unit="%" maxY={100} minSamples={MIN_SAMPLES} />
          <MiniLine title="Viết: tỷ lệ câu đúng ngay lần đầu" {...pick(q('writeFirstTry'))} unit="%" maxY={100} minSamples={MIN_SAMPLES} />
          <MiniLine title="Viết: số chỗ sửa trung bình mỗi câu" {...pick(q('writeCorrections'))} unit="" minSamples={MIN_SAMPLES} />
          <MiniLine title="Nói: mức khớp khi nhại theo mẫu" {...pick(q('speakMatch'))} unit="%" maxY={100} minSamples={MIN_SAMPLES} />
          <MiniLine title="Nghe: điểm tóm tắt trung bình" {...pick(q('listenScore'))} unit="" maxY={100} minSamples={MIN_SAMPLES} />
        </div>
        <p className="mt-2 text-xs text-muted">Các lượt bạn đã báo "kết quả AI sai" không được tính.</p>
      </Card>

      <Card title="Từ vựng theo chủ đề">
        <p className="mb-3 text-sm">Trong kỳ này thuộc thêm <b>{masteredInRange}</b> từ.</p>
        {fc
          ? <p className="mb-3 text-sm">Ước tính: với tốc độ 30 ngày gần nhất (~{fc.perDay.toFixed(1)} từ/ngày), cần khoảng <b>{fc.days} ngày</b> nữa để thuộc hết {totalWords} từ. Đây chỉ là ước tính.</p>
          : <p className="mb-3 text-xs text-muted">Dự báo ngày hoàn thành chỉ hiện khi có ít nhất 14 ngày dữ liệu và tốc độ thuộc từ lớn hơn 0.</p>}
        <ul className="flex flex-col gap-2">
          {idx?.topics.map(t => (
            <li key={t.id}>
              <div className="flex justify-between text-xs"><span>{t.vi}</span><span className="text-muted">{topicMastered.get(t.id) ?? 0}/{t.count}</span></div>
              <ProgressBar value={topicMastered.get(t.id) ?? 0} max={t.count} color="link" label={t.vi} />
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Lỗi sai theo loại">
        {errs.length === 0 ? <Empty>Không có lỗi nào được ghi trong kỳ này.</Empty> : (
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted"><th className="py-1 font-normal">Loại lỗi</th><th className="font-normal">Kỳ này</th><th className="font-normal">Kỳ trước</th><th className="font-normal">Xu hướng</th></tr></thead>
            <tbody>
              {errs.map(e => (
                <tr key={e.tag} className="border-t border-line">
                  <td className="py-2">{e.tag}</td><td>{e.count}</td><td>{e.previous}</td>
                  <td className={e.trend === 'down' ? 'text-ok' : e.trend === 'up' ? 'text-bad' : 'text-muted'}>{e.trend === 'down' ? '↓ giảm' : e.trend === 'up' ? '↑ tăng' : '= giữ nguyên'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <Card title="Mốc đã đạt">
        <ol className="flex flex-col gap-1 text-sm">
          {ms.map(m => (
            <li key={m.label} className="flex justify-between border-b border-line py-1.5 last:border-0">
              <span className={m.reached ? '' : 'text-muted'}>{m.label}</span>
              <span className={m.reached ? 'text-ok' : 'text-muted'}>{m.reached ? formatDayVi(m.reached) : 'chưa đạt'}</span>
            </li>
          ))}
        </ol>
      </Card>

      <Card title="Tóm tắt tuần">
        {summary ? <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">{summary.map((l, i) => <li key={i}>{l}</li>)}</ul>
          : <p className="text-sm text-muted">Cần ít nhất một tuần trọn vẹn để so sánh.</p>}
      </Card>

      <ExportCard />
      <p className="text-center text-xs text-muted">Số liệu kỳ này dựa trên {inRange.length} sự kiện trong nhật ký.</p>
    </>
  );
}

const pick = (r: { points: import('../../lib/stats').QualityPoint[]; total: number }) => ({ points: r.points, total: r.total });

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div><dt className="text-xs text-muted">{label}</dt><dd className="text-lg font-semibold">{value}</dd></div>;
}

function ExportCard() {
  return (
    <Card title="Xuất dữ liệu">
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={async () => download(`luyen-tieng-trung-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(await exportBackup()))}>Nhật ký (JSON)</Button>
        <Button onClick={async () => download(`tom-tat-theo-ngay-${new Date().toISOString().slice(0, 10)}.csv`, await dailyCsv(), 'text/csv')}>Theo ngày (CSV)</Button>
      </div>
    </Card>
  );
}
