// Small shared UI pieces. Style rules: cards 14px radius, progress bars 8px, primary buttons >= 52px,
// touch targets >= 44px, no emoji, never colour alone for right/wrong.
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export function Card({ title, children, className = '' }: { title?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[14px] border border-line bg-card p-4 ${className}`}>
      {title && <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted">{title}</h2>}
      {children}
    </section>
  );
}

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' };
export function Button({ variant = 'secondary', className = '', ...p }: BtnProps) {
  const styles = {
    primary: 'min-h-[52px] bg-accent text-bg font-semibold text-base',
    secondary: 'min-h-[44px] border border-line bg-card text-ink',
    ghost: 'min-h-[44px] text-link',
  }[variant];
  return <button type="button" className={`rounded-xl px-4 ${styles} ${className}`} {...p} />;
}

export function ProgressBar({ value, max, color = 'accent', label }: { value: number; max: number; color?: 'accent' | 'link' | 'ok'; label?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  const bg = { accent: 'bg-accent', link: 'bg-link', ok: 'bg-ok' }[color];
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={value} aria-valuemax={max} aria-label={label}>
      <div className={`h-full rounded-full ${bg}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'ok' | 'bad' | 'accent' | 'link' }) {
  const c = { muted: 'text-muted border-line', ok: 'text-ok border-ok/40', bad: 'text-bad border-bad/40', accent: 'text-accent border-accent/40', link: 'text-link border-link/40' }[tone];
  return <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs ${c}`}>{children}</span>;
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: Array<{ value: T; label: string }>; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-xl border border-line bg-card p-1" role="tablist">
      {options.map(o => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={`min-h-[40px] flex-1 rounded-lg text-sm ${value === o.value ? 'bg-line font-semibold text-accent' : 'text-muted'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Screen({ title, right, children }: { title: ReactNode; right?: ReactNode; children: ReactNode }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col gap-3 px-4 pb-28 pt-4">
      <header className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">{title}</h1>
        {right}
      </header>
      {children}
    </div>
  );
}

export function BackButton({ onClick, label = 'Quay lại' }: { onClick: () => void; label?: string }) {
  return (
    <button type="button" onClick={onClick} className="flex min-h-[44px] items-center gap-1 text-link">
      <Icon name="back" /> {label}
    </button>
  );
}

const PATHS: Record<string, string> = {
  calendar: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  book: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2V5zM4 19a2 2 0 0 1 2-2h13',
  pen: 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
  mic: 'M12 3a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3',
  headphones: 'M4 15v-3a8 8 0 0 1 16 0v3M4 15a2 2 0 0 1 2-2h1v7H6a2 2 0 0 1-2-2v-3zM20 15a2 2 0 0 0-2-2h-1v7h1a2 2 0 0 0 2-2v-3z',
  play: 'M7 5l12 7-12 7V5z',
  stop: 'M6 6h12v12H6z',
  back: 'M15 5l-7 7 7 7',
  check: 'M5 12l5 5 9-10',
  x: 'M6 6l12 12M18 6L6 18',
  search: 'M11 4a7 7 0 1 1 0 14 7 7 0 0 1 0-14zM20 20l-4-4',
  settings: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zM4 12h2M18 12h2M12 4v2M12 18v2M6.3 6.3l1.4 1.4M16.3 16.3l1.4 1.4M6.3 17.7l1.4-1.4M16.3 7.7l1.4-1.4',
  flag: 'M5 21V4M5 4h11l-2 4 2 4H5',
  replay: 'M4 12a8 8 0 1 0 3-6.2M4 4v5h5',
  film: 'M4 5h16v14H4zM8 5v14M16 5v14M4 9h4M4 15h4M16 9h4M16 15h4',
};

export function Icon({ name, size = 20, className = '' }: { name: keyof typeof PATHS | string; size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={PATHS[name]} />
    </svg>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line p-4 text-center text-sm text-muted">{children}</p>;
}
