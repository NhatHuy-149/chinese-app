import { useEffect, useState } from 'react';

/** Hash path parts after the tab, e.g. "#/vocab/topic/food" -> ["topic", "food"]. */
export function useRoute(): string[] {
  const read = () => location.hash.replace(/^#\/?/, '').split('/').slice(1).map(decodeURIComponent);
  const [parts, setParts] = useState(read);
  useEffect(() => {
    const on = () => setParts(read());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return parts;
}

export const go = (path: string) => { location.hash = `/${path.split('/').map(encodeURIComponent).join('/')}`; };
export const back = () => history.back();
