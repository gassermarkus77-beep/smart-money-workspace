'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Bar, Timeframe } from '@finberg/shared/market';
import { TIMEFRAMES } from '@finberg/shared';

// ChartEngine uses window/canvas — only render client-side.
const Chart = dynamic(
  () => import('@finberg/ui').then(m => ({ default: m.Chart })),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-text-subtle">Loading chart…</div> }
);

const DEFAULT_SYMBOL = 'BTCUSDT';
const DEFAULT_TF: Timeframe = '1h';

export default function ChartPage(): JSX.Element {
  const [symbol, setSymbol] = useState(DEFAULT_SYMBOL);
  const [timeframe, setTimeframe] = useState<Timeframe>(DEFAULT_TF);
  const [bars, setBars] = useState<Bar[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const to = Date.now();
    const from = to - 1000 * 60 * 60 * 24 * 30;
    fetch(`/api/proxy/market/bars?symbol=${symbol}&timeframe=${timeframe}&from=${from}&to=${to}&limit=500`)
      .then(r => r.json())
      .then((data: Bar[]) => { if (!cancelled) setBars(data); })
      .catch(() => { if (!cancelled) setBars(syntheticBars(symbol, timeframe, 500)); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [symbol, timeframe]);

  const headerBar = useMemo(() => bars.at(-1), [bars]);

  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 px-4 border-b border-bg-elevated flex items-center gap-4">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          className="bg-bg-subtle text-text px-3 py-1.5 rounded font-mono text-sm border border-bg-elevated focus:outline-none focus:ring-2 focus:ring-accent w-32"
        />
        <div className="flex gap-1">
          {TIMEFRAMES.filter(tf => ['1m','5m','15m','1h','4h','1d','1w'].includes(tf)).map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={`px-2.5 py-1 text-xs rounded ${tf === timeframe ? 'bg-accent text-white' : 'bg-bg-subtle text-text-muted hover:text-text'}`}
            >
              {tf}
            </button>
          ))}
        </div>
        {headerBar && (
          <div className="ml-auto flex items-center gap-4 font-mono text-xs text-text-muted">
            <span>O <span className="text-text">{headerBar.o.toFixed(2)}</span></span>
            <span>H <span className="text-text">{headerBar.h.toFixed(2)}</span></span>
            <span>L <span className="text-text">{headerBar.l.toFixed(2)}</span></span>
            <span>C <span className={headerBar.c >= headerBar.o ? 'text-accent' : 'text-danger'}>{headerBar.c.toFixed(2)}</span></span>
          </div>
        )}
      </header>
      <main className="flex-1">
        {loading
          ? <div className="h-full flex items-center justify-center text-text-subtle">Loading…</div>
          : <Chart symbol={symbol} timeframe={timeframe} bars={bars} />
        }
      </main>
    </div>
  );
}

// Fallback for local dev when the API isn't running.
function syntheticBars(symbol: string, timeframe: Timeframe, n: number): Bar[] {
  const tfMs: Record<string, number> = { '1m': 60_000, '5m': 300_000, '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000, '1w': 604_800_000 };
  const step = tfMs[timeframe] ?? 3_600_000;
  let p = 100 + hash(symbol) % 1000;
  const out: Bar[] = [];
  let t = Date.now() - n * step;
  for (let i = 0; i < n; i++) {
    const o = p;
    const c = Math.max(0.01, o + (Math.random() - 0.5) * o * 0.02);
    const h = Math.max(o, c) + Math.random() * o * 0.01;
    const l = Math.min(o, c) - Math.random() * o * 0.01;
    out.push({ t, o, h, l, c, v: Math.round(1000 + Math.random() * 5000) });
    p = c; t += step;
  }
  return out;
}
function hash(s: string): number { let h = 0; for (const c of s) h = ((h << 5) - h + c.charCodeAt(0)) | 0; return Math.abs(h); }
