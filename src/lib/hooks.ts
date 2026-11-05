import { useEffect, useState } from 'react';
import { changes } from './storage';

/** Runs an async loader on mount and whenever app data changes. */
export function useData<T>(load: () => Promise<T>, deps: unknown[] = []): T | undefined {
  const [value, setValue] = useState<T>();
  useEffect(() => {
    let alive = true;
    const run = () => { load().then(v => { if (alive) setValue(v); }); };
    run();
    changes.addEventListener('change', run);
    return () => { alive = false; changes.removeEventListener('change', run); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return value;
}

/** Measures how long the learner spent on one item (for the measured practice minutes). */
export function useStopwatch() {
  const [start, setStart] = useState(() => Date.now());
  return {
    reset: () => setStart(Date.now()),
    seconds: () => Math.round((Date.now() - start) / 1000),
  };
}
