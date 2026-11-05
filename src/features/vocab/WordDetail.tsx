import { useEffect, useRef, useState } from 'react';
import { Badge, Button, Card, Icon } from '../../ui/kit';
import { speak } from '../../lib/tts';
import { flagWrong } from '../../lib/events';
import { strokeUrl, type Word } from '../../lib/words';

/** Legacy explanations contain only <b> markup: escape everything else. */
function safeStructure(html: string): string {
  const esc = html.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return esc.replace(/&lt;(\/?)b&gt;/g, '<$1b>');
}

export function AiBadge({ word }: { word: Word }) {
  if (!word.aiFields?.length) return null;
  const names = { vi: 'nghĩa', hanViet: 'Hán Việt', example: 'ví dụ' };
  return <Badge tone="link">Do AI tạo: {word.aiFields.map(f => names[f]).join(', ')}</Badge>;
}

export default function WordDetail({ word }: { word: Word }) {
  const [showStrokes, setShowStrokes] = useState(false);
  const [flagged, setFlagged] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="han text-5xl font-bold leading-tight">{word.hanzi}</div>
            <div className="mt-1 text-lg text-link">{word.pinyin}</div>
            {word.hanViet && <div className="text-sm text-muted">Hán Việt: {word.hanViet}</div>}
          </div>
          <Button aria-label="Nghe" onClick={() => speak(word.hanzi)}><Icon name="play" /></Button>
        </div>
        <p className="mt-3 text-lg">{word.vi}</p>
        {word.classifiers?.length ? <p className="mt-1 text-sm text-muted">Lượng từ: <span className="han">{word.classifiers.join('、')}</span></p> : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <AiBadge word={word} />
          {word.needsReview && <Badge tone="bad">Cần kiểm tra lại</Badge>}
        </div>
      </Card>

      {word.example && (
        <Card title="Ví dụ">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="han text-xl">{word.example.zh}</div>
              <div className="text-sm text-link">{word.example.py}</div>
              <div className="text-sm text-muted">{word.example.vi}</div>
            </div>
            <Button aria-label="Nghe câu ví dụ" onClick={() => speak(word.example!.zh)}><Icon name="play" /></Button>
          </div>
        </Card>
      )}

      <Card title="Chiết tự">
        {word.structure && <p className="structure mb-3 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: safeStructure(word.structure) }} />}
        <ul className="flex flex-col gap-1 text-sm">
          {word.chars.map(ch => (
            <li key={ch.c}>
              <span className="han text-lg">{ch.c}</span>
              {ch.radical && <span className="text-muted"> · bộ <span className="han">{ch.radical}</span>{ch.radicalVi ? ` (${ch.radicalVi})` : ''}</span>}
              {ch.strokes ? <span className="text-muted"> · {ch.strokes} nét</span> : null}
              {ch.parts && <span className="text-muted"> · cấu tạo <span className="han">{ch.parts}</span></span>}
            </li>
          ))}
        </ul>
        {!word.structure && <p className="mt-2 text-xs text-muted">Chưa có giải thích chiết tự cho từ này.</p>}
        <Button className="mt-3 w-full" onClick={() => setShowStrokes(s => !s)}>{showStrokes ? 'Ẩn nét chữ' : 'Xem nét chữ'}</Button>
        {showStrokes && <Strokes chars={word.chars.map(c => c.c)} />}
      </Card>

      <Button variant="ghost" disabled={flagged} onClick={async () => {
        const note = prompt('Chỗ nào sai? (không bắt buộc)') ?? '';
        await flagWrong({ skill: 'vocab', itemId: word.id }, note);
        setFlagged(true);
      }}>
        <span className="inline-flex items-center gap-1"><Icon name="flag" size={16} /> {flagged ? 'Đã ghi nhận' : 'Báo dữ liệu này sai'}</span>
      </Button>
    </div>
  );
}

/** Stroke-order animation; Hanzi Writer and stroke data load only when opened. */
function Strokes({ chars }: { chars: string[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { default: HanziWriter } = await import('hanzi-writer');
        if (cancelled || !ref.current) return;
        ref.current.innerHTML = '';
        for (const c of chars) {
          const box = document.createElement('div');
          ref.current.appendChild(box);
          const w = HanziWriter.create(box, c, {
            width: 110, height: 110, padding: 6, showOutline: true,
            strokeColor: '#eeeae0', outlineColor: '#2b3645', radicalColor: '#e3a83b',
            delayBetweenStrokes: 250,
            charDataLoader: (ch, onLoad, onError) => {
              fetch(strokeUrl(ch)).then(r => (r.ok ? r.json() : Promise.reject(r.status))).then(onLoad, onError);
            },
          });
          box.addEventListener('click', () => w.animateCharacter());
          w.animateCharacter();
        }
      } catch {
        if (!cancelled) setError('Không tải được nét chữ (cần mạng lần đầu).');
      }
    })();
    return () => { cancelled = true; };
  }, [chars]);
  return (
    <div className="mt-3">
      <div ref={ref} className="flex flex-wrap justify-center gap-2" />
      <p className="mt-1 text-center text-xs text-muted">{error || 'Bấm vào chữ để xem lại.'}</p>
    </div>
  );
}
