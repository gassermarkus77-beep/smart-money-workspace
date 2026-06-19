// ============================================================================
// DetectionLegend — toggleable visibility for each detector kind, sits in the
// chart header. The active set is controlled by the parent.
// ============================================================================

import type { SmcEvent } from './types';

const ENTRIES: Array<{ kind: SmcEvent['kind']; label: string; swatch: string }> = [
  { kind: 'FVG',       label: 'FVG',          swatch: 'bg-emerald-500/30' },
  { kind: 'OB',        label: 'Order Block',  swatch: 'bg-emerald-500/60' },
  { kind: 'BB',        label: 'Breaker',      swatch: 'bg-blue-500/60' },
  { kind: 'PD_ZONE',   label: 'Premium / Discount', swatch: 'bg-slate-500/40' },
  { kind: 'LIQ_SWEEP', label: 'Liquidity Sweep', swatch: 'bg-yellow-400' },
  { kind: 'BOS',       label: 'BOS',          swatch: 'bg-emerald-500' },
  { kind: 'CHOCH',     label: 'CHOCH',        swatch: 'bg-orange-500' },
  { kind: 'MSS',       label: 'MSS',          swatch: 'bg-red-500' },
  { kind: 'EQH',       label: 'Equal Highs',  swatch: 'bg-white/60' },
  { kind: 'EQL',       label: 'Equal Lows',   swatch: 'bg-white/60' },
  { kind: 'PDH',       label: 'PDH/PDL',      swatch: 'bg-white/60' },
  { kind: 'ASIA_H',    label: 'Asia H/L',     swatch: 'bg-white/60' },
];

export interface DetectionLegendProps {
  active: Set<SmcEvent['kind']>;
  onToggle: (kind: SmcEvent['kind']) => void;
}

export function DetectionLegend({ active, onToggle }: DetectionLegendProps): JSX.Element {
  return (
    <div className="flex flex-wrap gap-1.5">
      {ENTRIES.map(e => (
        <button
          key={e.kind}
          onClick={() => onToggle(e.kind)}
          className={`flex items-center gap-1.5 px-2 py-1 text-[11px] rounded border transition-colors ${
            active.has(e.kind)
              ? 'border-bg-elevated bg-bg-elevated text-text'
              : 'border-transparent text-text-subtle hover:text-text-muted'
          }`}
        >
          <span className={`w-2.5 h-2.5 rounded-sm ${e.swatch}`} />
          {e.label}
        </button>
      ))}
    </div>
  );
}
