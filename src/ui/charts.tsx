// Lightweight SVG charts. Every chart has a text description; series are named in a legend
// and distinguished by colour AND pattern/position, never colour alone.
import { useState } from 'react';
import type { Skill } from '../lib/events';
import type { QualityPoint, VolumeBucket } from '../lib/stats';
import { formatDayVi, weekdayVi } from '../lib/day';

export const SKILL_META: Record<Skill, { label: string; color: string; dash: string }> = {
  vocab: { label: 'Ôn từ', color: '#7cb4ea', dash: '' },
  write: { label: 'Viết', color: '#e3a83b', dash: '' },
  speak: { label: 'Nói', color: '#7ed4a0', dash: '' },
  listen: { label: 'Nghe', color: '#c9a0f2', dash: '' },
};
const ORDER: Skill[] = ['vocab', 'write', 'speak', 'listen'];

function Legend() {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {ORDER.map((s, i) => (
        <li key={s} className="flex items-center gap-1">
          <svg width="12" height="12" aria-hidden="true"><rect width="12" height="12" rx="2" fill={SKILL_META[s].color} fillOpacity={1 - i * 0.12} /></svg>
          {SKILL_META[s].label} ({i + 1})
        </li>
      ))}
    </ul>
  );
}

/** Stacked bars of measured minutes per skill; bottom-to-top order is fixed (1 = ôn từ … 4 = nghe). */
export function StackedBars({ data }: { data: VolumeBucket[] }) {
  const [sel, setSel] = useState<number | null>(null);
  const totals = data.map(b => ORDER.reduce((a, s) => a + b.minutes[s], 0));
  const max = Math.max(1, ...totals);
  const W = 320, H = 140, pad = 22, bw = (W - pad) / data.length;
  const totalAll = totals.reduce((a, b) => a + b, 0);
  const desc = `Tổng ${Math.round(totalAll)} phút. ` + ORDER.map(s => `${SKILL_META[s].label} ${Math.round(data.reduce((a, b) => a + b.minutes[s], 0))} phút`).join(', ') + '.';
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H + 18}`} className="w-full" role="img" aria-label={`Biểu đồ phút luyện tập. ${desc}`}>
        <text x="0" y="10" fontSize="9" fill="#a3aebb">{Math.round(max)} ph</text>
        <line x1={pad} x2={W} y1={H} y2={H} stroke="#2b3645" />
        {data.map((b, i) => {
          let y = H;
          const x = pad + i * bw + bw * 0.15;
          return (
            <g key={b.key} onClick={() => setSel(sel === i ? null : i)} className="cursor-pointer">
              <rect x={pad + i * bw} y={0} width={bw} height={H} fill="transparent" />
              {ORDER.map((s, k) => {
                const h = (b.minutes[s] / max) * (H - 14);
                y -= h;
                return h > 0 ? <rect key={s} x={x} y={y} width={bw * 0.7} height={h} fill={SKILL_META[s].color} fillOpacity={1 - k * 0.12} stroke="#131820" strokeWidth={0.5} /> : null;
              })}
              {(data.length <= 10 || i % Math.ceil(data.length / 8) === 0) && <text x={x + bw * 0.35} y={H + 12} fontSize="8" textAnchor="middle" fill="#a3aebb">{b.label}</text>}
            </g>
          );
        })}
      </svg>
      <Legend />
      <figcaption className="mt-1 text-xs text-muted">
        {sel !== null ? `${data[sel].label}: ` + ORDER.map(s => `${SKILL_META[s].label} ${Math.round(data[sel].minutes[s])} ph`).join(' · ') : desc}
      </figcaption>
    </figure>
  );
}

/** Calendar heatmap (columns = weeks, rows = Mon..Sun). Darker = more minutes; the number shows on tap. */
export function Heatmap({ cells, onSelect }: { cells: Array<{ n: number; key: string; minutes: number; future: boolean }>; onSelect?: (key: string) => void }) {
  const [sel, setSel] = useState<string | null>(null);
  const max = Math.max(1, ...cells.map(c => c.minutes));
  const weeks = cells.length / 7, size = 14, gap = 3;
  const level = (m: number) => (m <= 0 ? 0 : Math.min(4, Math.ceil((m / max) * 4)));
  const fills = ['#1c2430', '#3b4f3f', '#4f7d5d', '#66a87b', '#7ed4a0'];
  const active = cells.filter(c => c.minutes > 0).length;
  const selected = cells.find(c => c.key === sel);
  return (
    <figure>
      <svg viewBox={`0 0 ${weeks * (size + gap)} ${7 * (size + gap)}`} className="w-full" role="img"
        aria-label={`Lịch nhiệt ${weeks} tuần: ${active} ngày có luyện tập.`}>
        {cells.map((c, i) => (
          <rect key={c.key} x={Math.floor(i / 7) * (size + gap)} y={(i % 7) * (size + gap)} width={size} height={size} rx={3}
            fill={c.future ? 'transparent' : fills[level(c.minutes)]} stroke={c.key === sel ? '#e3a83b' : '#2b3645'} strokeWidth={c.key === sel ? 1.5 : 0.5}
            onClick={() => { if (!c.future) { setSel(c.key); onSelect?.(c.key); } }} className="cursor-pointer">
            <title>{`${formatDayVi(c.key)}: ${Math.round(c.minutes)} phút`}</title>
          </rect>
        ))}
      </svg>
      <figcaption className="mt-1 text-xs text-muted">
        {selected ? `${weekdayVi(selected.n)} ${formatDayVi(selected.key)}: ${Math.round(selected.minutes)} phút luyện` : `${active} ngày có luyện trong ${weeks} tuần gần nhất. Bấm vào một ô để xem.`}
        <span className="ml-2 inline-flex items-center gap-1">ít {fills.map(f => <span key={f} className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: f }} />)} nhiều</span>
      </figcaption>
    </figure>
  );
}

/** Small line chart with axis labels; points under the minimum sample size are gaps. */
export function MiniLine({ title, points, total, unit, maxY, minSamples }: {
  title: string; points: QualityPoint[]; total: number; unit: string; maxY?: number; minSamples: number;
}) {
  const valid = points.filter(p => p.value !== null);
  const W = 300, H = 90, padL = 26, padB = 14;
  if (total < minSamples || valid.length === 0) {
    return (
      <div className="rounded-xl border border-line p-3">
        <div className="text-sm">{title}</div>
        <p className="mt-2 text-xs text-muted">Chưa đủ dữ liệu (cần ít nhất {minSamples} lượt trong một {points.length > 10 ? 'ngày' : 'kỳ'}; hiện có {total} lượt).</p>
      </div>
    );
  }
  const top = maxY ?? Math.max(1, ...valid.map(p => p.value!));
  const x = (i: number) => padL + (i / Math.max(1, points.length - 1)) * (W - padL - 4);
  const y = (v: number) => 4 + (1 - v / top) * (H - padB - 4);
  const segments: string[] = [];
  let cur = '';
  points.forEach((p, i) => {
    if (p.value === null) { if (cur) segments.push(cur); cur = ''; return; }
    cur += `${cur ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`;
  });
  if (cur) segments.push(cur);
  const last = valid[valid.length - 1], first = valid[0];
  const fmt = (v: number) => `${Math.round(v * 10) / 10}${unit}`;
  return (
    <figure className="rounded-xl border border-line p-3">
      <div className="flex justify-between text-sm"><span>{title}</span><span className="text-muted">dựa trên {total} lượt</span></div>
      <svg viewBox={`0 0 ${W} ${H}`} className="mt-1 w-full" role="img" aria-label={`${title}: từ ${fmt(first.value!)} (${first.label}) đến ${fmt(last.value!)} (${last.label}).`}>
        <text x="0" y="10" fontSize="8" fill="#a3aebb">{fmt(top)}</text>
        <text x="0" y={H - padB} fontSize="8" fill="#a3aebb">0</text>
        <line x1={padL} x2={W} y1={H - padB} y2={H - padB} stroke="#2b3645" />
        {segments.map((d, i) => <path key={i} d={d} fill="none" stroke="#7cb4ea" strokeWidth={2} />)}
        {points.map((p, i) => p.value !== null && <circle key={i} cx={x(i)} cy={y(p.value)} r={2.5} fill="#7cb4ea"><title>{`${p.label}: ${fmt(p.value)} (${p.n} lượt)`}</title></circle>)}
        <text x={padL} y={H - 2} fontSize="8" fill="#a3aebb">{points[0].label}</text>
        <text x={W} y={H - 2} fontSize="8" fill="#a3aebb" textAnchor="end">{points[points.length - 1].label}</text>
      </svg>
      <figcaption className="text-xs text-muted">Gần nhất: {fmt(last.value!)} ({last.label}). Kỳ có dưới {minSamples} lượt không vẽ.</figcaption>
    </figure>
  );
}
