'use client';

// ============================================================================
// FINBERG MARKETS — TradingView-style chart workspace
//
// Layout:
//   ┌──────────────────────────────────────────────────────────┐
//   │ ChartToolbar (symbol · TFs · chart types · indicators)   │
//   ├──┬───────────────────────────────────────────┬───────────┤
//   │D │                                           │ Watchlist │
//   │R │           Chart canvas + OHLC HUD         │ (live)    │
//   │A │                                           │           │
//   │W │                                           │           │
//   ├──┴───────────────────────────────────────────┴───────────┤
//   │ RangeBar (1D 5D 1M ... + UTC clock)                       │
//   └──────────────────────────────────────────────────────────┘
// ============================================================================

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Timeframe } from '@finberg/shared/market';
import type { ChartType } from '@finberg/ui';
import { useBinanceLiveBars } from '../../lib/binance-stream';
import { ChartToolbar }   from '../../components/ChartToolbar';
import { DrawingToolbar, type DrawingTool } from '../../components/DrawingToolbar';
import { Watchlist }      from '../../components/Watchlist';
import { RangeBar, RANGE_TIMEFRAME, type RangePreset } from '../../components/RangeBar';

const Chart = dynamic(
  () => import('@finberg/ui').then(m => ({ default: m.Chart })),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center text-text-subtle">Loading chart…</div> }
);

export default function ChartPage(): JSX.Element {
  const [symbol, setSymbol]       = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  const [chartType, setChartType] = useState<ChartType>('candles');
  const [tool, setTool]           = useState<DrawingTool>('cursor');
  const [range, setRange]         = useState<RangePreset | null>(null);

  const live = useBinanceLiveBars(symbol, timeframe, 500);
  const lastBar = useMemo(() => live.bars.at(-1), [live.bars]);
  const isLoading = live.bars.length === 0 && !live.error;

  const onRange = (r: RangePreset): void => {
    setRange(r);
    setTimeframe(RANGE_TIMEFRAME[r]);
  };

  return (
    <div className="h-screen flex flex-col bg-bg text-text">
      <ChartToolbar
        symbol={symbol}
        timeframe={timeframe}
        chartType={chartType}
        onSymbol={setSymbol}
        onTimeframe={(tf) => { setTimeframe(tf); setRange(null); }}
        onChartType={setChartType}
        connected={live.connected}
      />

      {live.error && (
        <div className="px-4 py-1.5 bg-danger/10 text-danger text-xs border-b border-danger/30">
          {live.error}
        </div>
      )}

      <div className="flex-1 flex overflow-hidden">
        <DrawingToolbar active={tool} onSelect={setTool} />

        <main className="flex-1 relative bg-bg">
          {/* Top-left HUD over the chart */}
          {lastBar && (
            <div className="absolute top-2 left-3 z-10 flex items-center gap-3 text-[11px] font-mono text-text-muted pointer-events-none">
              <span className="font-semibold text-text text-xs">{symbol}</span>
              <span>· {timeframe}</span>
              <span>· Binance</span>
              <span className={lastBar.c >= lastBar.o ? 'text-accent' : 'text-danger'}>●</span>
              <span>O <span className="text-text">{fmt(lastBar.o)}</span></span>
              <span>H <span className="text-text">{fmt(lastBar.h)}</span></span>
              <span>L <span className="text-text">{fmt(lastBar.l)}</span></span>
              <span>C <span className={lastBar.c >= lastBar.o ? 'text-accent' : 'text-danger'}>{fmt(lastBar.c)}</span></span>
              <span>Vol <span className="text-text">{fmtVol(lastBar.v)}</span></span>
            </div>
          )}

          {/* Active-tool hint */}
          {tool !== 'cursor' && (
            <div className="absolute top-2 right-3 z-10 px-2 py-0.5 rounded bg-accent/15 text-accent text-[10px] font-mono pointer-events-none">
              tool: {tool}  ·  (canvas interaction lands in v2)
            </div>
          )}

          {isLoading
            ? <div className="h-full flex items-center justify-center text-text-subtle">Loading {symbol} from Binance…</div>
            : <Chart symbol={symbol} timeframe={timeframe} bars={live.bars} chartType={chartType} />
          }
        </main>

        <Watchlist selected={symbol} onSelect={setSymbol} />
      </div>

      <RangeBar active={range} onSelect={onRange} />
    </div>
  );
}

function fmt(x: number): string {
  if (x >= 1000) return x.toFixed(2);
  if (x >= 1)    return x.toFixed(4);
  return x.toPrecision(5);
}
function fmtVol(v: number): string {
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(2) + 'M';
  if (v >= 1_000)     return (v / 1_000).toFixed(2) + 'K';
  return v.toFixed(2);
}
