import { useEffect, useState } from 'react';

type Piece = { ch: string; py: string };
let lib: typeof import('pinyin-pro') | null = null;

/**
 * Chinese text with pinyin above each character (<ruby>). pinyin-pro reads the whole sentence,
 * so polyphones (行, 了, 得…) get their reading from context.
 */
export function RubyText({ text, showPinyin, className = '' }: { text: string; showPinyin: boolean; className?: string }) {
  const [pieces, setPieces] = useState<Piece[] | null>(null);
  useEffect(() => {
    let alive = true;
    (async () => {
      lib ??= await import('pinyin-pro');
      const all = lib.pinyin(text, { type: 'all', toneType: 'symbol', nonZh: 'consecutive' });
      if (alive) setPieces(all.map(p => ({ ch: p.origin, py: p.isZh ? p.pinyin : '' })));
    })();
    return () => { alive = false; };
  }, [text]);

  if (!pieces || !showPinyin) return <span className={`han ${className}`}>{text}</span>;
  return (
    <span className={`han ${className}`} lang="zh-CN">
      {pieces.map((p, i) => p.py
        ? <ruby key={i}>{p.ch}<rt className="font-sans text-[0.45em] font-normal text-link">{p.py}</rt></ruby>
        : <span key={i}>{p.ch}</span>)}
    </span>
  );
}
