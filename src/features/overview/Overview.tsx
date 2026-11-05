import { Badge, BackButton, Icon, Screen, Segmented } from '../../ui/kit';
import { back, go, useRoute } from '../../lib/route';
import { useData } from '../../lib/hooks';
import { allEvents } from '../../lib/events';
import { streaks } from '../../lib/stats';
import { formatDayVi, todayKey, todayNum, weekdayVi } from '../../lib/day';
import Today from './Today';
import Progress from './Progress';
import Settings from './Settings';

export default function Overview() {
  const [view] = useRoute();
  const events = useData(allEvents);
  const streak = events ? streaks(events, todayNum()).current : 0;

  if (view === 'settings') return <Screen title="Cài đặt & dữ liệu"><BackButton onClick={back} /><Settings /></Screen>;

  const tab = view === 'progress' ? 'progress' : 'today';
  return (
    <Screen
      title={<span className="flex flex-col"><span className="text-xs font-normal text-muted">{weekdayVi(todayNum())}, {formatDayVi(todayKey())}</span>{tab === 'today' ? 'Hôm nay' : 'Tiến trình'}</span>}
      right={
        <div className="flex items-center gap-2">
          <Badge tone={streak > 0 ? 'accent' : 'muted'}>Chuỗi {streak} ngày</Badge>
          <a href="#/overview/settings" aria-label="Cài đặt và sao lưu" className="flex min-h-[44px] min-w-[44px] items-center justify-center text-muted"><Icon name="settings" /></a>
        </div>
      }>
      <Segmented value={tab} onChange={v => go(v === 'today' ? 'overview' : 'overview/progress')}
        options={[{ value: 'today', label: 'Hôm nay' }, { value: 'progress', label: 'Tiến trình' }]} />
      {events === undefined ? <p className="text-muted">Đang tải…</p> : tab === 'today' ? <Today events={events} /> : <Progress events={events} />}
    </Screen>
  );
}
