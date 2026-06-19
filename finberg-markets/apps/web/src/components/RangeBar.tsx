'use client';

// ============================================================================
// Bottom range bar — TradingView-style quick zoom + UTC clock.
// Selecting a range hint sets the parent's preferred timeframe; the chart
// then back-fills the appropriate number of bars.
// ============================================================================

import { Calendar } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { Timeframe } from '@finberg/shared/market';

export type RangePreset = '1D' | '5D' | '1M' | '3M' | '6M' | 'YTD' | '1Y' | '5Y' | 'ALL';

/** Recommended timeframe for each range — keeps bar count in a sane window. */
export const RANGE_TIMEFRAME: Record<RangePreset, Timeframe> = {
  '1D':  '5m',
  '5D':  '15m',
  '1M':  '1h',
  '3M':  '4h',
  '6M':  '4h',
  'YTD': '1d',
  '1Y':  '1d',
  '5Y':  '1w',
  'ALL': '1w',
};

const PRESETS: RangePreset[] = ['1D', '5D', '1M', '3M', '6M', 'YTD', '1Y', '5Y', 'ALL'];

export interface RangeBarProps {
  active: RangePreset | null;
  onSelect: (r: RangePreset) => void;
}

export function RangeBar({ active, onSelect }: RangeBarProps): JSX.Element {
  const [now, setNow] = useState<string>('');

  useEffect(() => {
    const fmt = (): string => {
      const d = new Date();
      const hh = String(d.getUTCHours()).padStart(2, '0');
      const mm = String(d.getUTCMinutes()).padStart(2, '0');
      const ss = String(d.getUTCSeconds()).padStart(2, '0');
      return `${hh}:${mm}:${ss} UTC`;
    };
    setNow(fmt());
    const id = setInterval(() => setNow(fmt()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <footer className="h-9 px-3 border-t border-bg-elevated bg-bg flex items-center gap-1 text-xs text-text-muted">
      <div className="flex items-center gap-0.5">
        {PRESETS.map(r => (
          <button
            key={r}
            onClick={() => onSelect(r)}
            className={`h-7 px-2 text-xs rounded font-medium transition-colors ${
              active === r
                ? 'bg-accent/15 text-accent'
                : 'text-text-muted hover:bg-bg-elevated hover:text-text'
            }`}
          >
            {r === 'ALL' ? 'All' : r}
          </button>
        ))}
        <button className="h-7 px-2 text-xs rounded text-text-muted hover:bg-bg-elevated hover:text-text inline-flex items-center gap-1.5">
          <Calendar size={12} /> Date range
        </button>
      </div>
      <span className="ml-auto font-mono">{now}</span>
    </footer>
  );
}
