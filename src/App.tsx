import { useEffect, useState } from 'react';
import { Icon } from './ui/kit';
import { IS_DEV_DB } from './lib/storage';
import Overview from './features/overview/Overview';
import Vocab from './features/vocab/Vocab';
import Write from './features/write/Write';
import Speak from './features/speak/Speak';
import Listen from './features/listen/Listen';
import Video from './features/video/Video';

export type Tab = 'overview' | 'vocab' | 'write' | 'speak' | 'listen' | 'video';

const TABS: Array<{ id: Tab; label: string; icon: string }> = [
  { id: 'overview', label: 'Tổng quan', icon: 'calendar' },
  { id: 'vocab', label: 'Từ vựng', icon: 'book' },
  { id: 'write', label: 'Viết', icon: 'pen' },
  { id: 'speak', label: 'Nói', icon: 'mic' },
  { id: 'listen', label: 'Nghe', icon: 'headphones' },
  // 6th tab: decided by the owner on 2026-11-08 (exception to the 5-section rule)
  { id: 'video', label: 'Video', icon: 'film' },
];

const tabFromHash = (): Tab => {
  const h = location.hash.replace(/^#\/?/, '').split('/')[0];
  return (TABS.find(t => t.id === h)?.id ?? 'overview');
};

export default function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  useEffect(() => {
    const on = () => { setTab(tabFromHash()); window.scrollTo(0, 0); };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);

  return (
    <div className="min-h-full">
      {IS_DEV_DB && (
        <div className="bg-bad px-4 py-1 text-center text-xs font-semibold text-bg">DỮ LIỆU MẪU (chế độ phát triển, không phải dữ liệu thật)</div>
      )}
      <main>
        {tab === 'overview' && <Overview />}
        {tab === 'vocab' && <Vocab />}
        {tab === 'write' && <Write />}
        {tab === 'speak' && <Speak />}
        {tab === 'listen' && <Listen />}
        {tab === 'video' && <Video />}
      </main>
      <nav className="fixed inset-x-0 bottom-0 border-t border-line bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto flex max-w-xl">
          {TABS.map(t => (
            <li key={t.id} className="flex-1">
              <a href={`#/${t.id}`} aria-current={tab === t.id ? 'page' : undefined}
                className={`flex min-h-[58px] flex-col items-center justify-center gap-0.5 text-[10px] ${tab === t.id ? 'font-bold text-accent' : 'text-muted'}`}>
                <Icon name={t.icon} size={22} />
                {t.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
