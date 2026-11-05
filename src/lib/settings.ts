// Minimal settings (stored in IndexedDB kv). Defaults decided 2026-11-05.
import { useEffect, useState } from 'react';
import { changes, kvGet, kvSet, notifyChange } from './storage';

export type Settings = {
  newPerDay: number;          // 5–50
  reviewCap: number;          // max cards per day; above it no new words are added
  goals: { vocab: number; write: number; speak: number; listen: number };
  passcode: string;           // sent to the AI proxy
  topicOrder: string[];       // topics the learner prioritised
};

export const DEFAULT_SETTINGS: Settings = {
  newPerDay: 20,
  reviewCap: 150,
  goals: { vocab: 20, write: 5, speak: 10, listen: 2 },
  passcode: '',
  topicOrder: [],
};

export async function getSettings(): Promise<Settings> {
  const s = await kvGet<Partial<Settings>>('settings', {});
  return { ...DEFAULT_SETTINGS, ...s, goals: { ...DEFAULT_SETTINGS.goals, ...s.goals } };
}

export async function updateSettings(patch: Partial<Settings>): Promise<void> {
  await kvSet('settings', { ...(await getSettings()), ...patch });
  notifyChange();
}

export function useSettings(): Settings | null {
  const [s, setS] = useState<Settings | null>(null);
  useEffect(() => {
    const load = () => { getSettings().then(setS); };
    load();
    changes.addEventListener('change', load);
    return () => changes.removeEventListener('change', load);
  }, []);
  return s;
}
