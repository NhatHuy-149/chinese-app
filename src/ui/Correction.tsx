import type { SentenceResult } from '../lib/api';
import { speak } from '../lib/tts';
import { Badge, Button, Card, Icon } from './kit';
import type { DiffPart } from '../lib/compare';

/** Corrected sentence with the list of fixes; shared by Write and free speaking. */
export function CorrectionCard({ original, result, mock }: { original: string; result: SentenceResult; mock?: boolean }) {
  const fixed = !result.is_correct || result.corrections.length > 0;
  return (
    <Card>
      <div className="mb-3 flex flex-wrap gap-2">
        {fixed ? <Badge tone="accent">Đã sửa</Badge> : <Badge tone="ok">Câu đã đúng</Badge>}
        <Badge tone="link">Do AI tạo, có thể sai</Badge>
        {mock && <Badge tone="bad">Dữ liệu thử nghiệm</Badge>}
      </div>
      <p className="text-sm text-muted">Bạn viết: <span className="text-ink">{original}</span></p>
      <div className="mt-3 flex items-start justify-between gap-2">
        <div>
          <div className="han text-3xl font-bold leading-snug">{result.hanzi}</div>
          <div className="mt-1 text-link">{result.pinyin}</div>
          <div className="text-muted">{result.meaning}</div>
        </div>
        <Button aria-label="Nghe câu đúng" onClick={() => speak(result.hanzi)}><Icon name="play" /></Button>
      </div>
      {result.corrections.length > 0 && (
        <ul className="mt-4 flex flex-col gap-3 border-t border-line pt-3">
          {result.corrections.map((c, i) => (
            <li key={i} className="text-sm">
              <span className="han text-base text-bad line-through">{c.original || '(thiếu)'}</span>
              <span className="mx-2 text-muted">→</span>
              <span className="han text-base text-ok">{c.fixed}</span>
              <p className="mt-0.5 text-muted">{c.reason}</p>
            </li>
          ))}
        </ul>
      )}
      {result.error_tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">{result.error_tags.map(t => <Badge key={t}>{t}</Badge>)}</div>
      )}
      {result.alternative && (
        <div className="mt-4 rounded-xl border border-line p-3 text-sm">
          <div className="text-muted">Cách nói tự nhiên hơn</div>
          <div className="han text-lg">{result.alternative.hanzi}</div>
          <div className="text-link">{result.alternative.pinyin}</div>
          <div className="text-muted">{result.alternative.meaning}</div>
        </div>
      )}
    </Card>
  );
}

/** Target text with unmatched characters highlighted (red + underline, not colour alone). */
export function DiffText({ parts, className = '' }: { parts: DiffPart[]; className?: string }) {
  return (
    <span className={`han ${className}`}>
      {parts.map((p, i) => p.ok
        ? <span key={i}>{p.ch}</span>
        : <span key={i} className="text-bad underline decoration-2 underline-offset-4">{p.ch}</span>)}
    </span>
  );
}
