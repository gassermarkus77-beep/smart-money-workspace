'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Timeframe } from '@finberg/shared/market';
import { TIMEFRAMES } from '@finberg/shared';
import { POPULAR_SYMBOLS } from '../../lib/binance';
import { useBinanceLiveBars } from '../../lib/binance-stream';

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
  const { bars, connected, lastUpdate, error } = useBinanceLiveBars(symbol, timeframe, 500);

  const headerBar = useMemo(() => bars.at(-1), [bars]);
  const isLoading = bars.length === 0 && !error;

  return (
    <div className="h-screen flex flex-col">
      <header className="h-12 px-4 border-b border-bg-elevated flex items-center gap-4">
        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          list="finberg-symbols"
          spellCheck={false}
          className="bg-bg-subtle text-text px-3 py-1.5 rounded font-mono text-sm border border-bg-elevated focus:outline-none focus:ring-2 focus:ring-accent w-32"
        />
        <datalist id="finberg-symbols">
          {POPULAR_SYMBOLS.map(s => <option key={s} value={s} />)}
        </datalist>

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

        <ConnectionDot connected={connected} lastUpdate={lastUpdate} />

        {headerBar && (
          <div className="ml-auto flex items-center gap-4 font-mono text-xs text-text-muted">
            <span>O <span className="text-text">{headerBar.o.toFixed(2)}</span></span>
            <span>H <span className="text-text">{headerBar.h.toFixed(2)}</span></span>
            <span>L <span className="text-text">{headerBar.l.toFixed(2)}</span></span>
            <span>C <span className={headerBar.c >= headerBar.o ? 'text-accent' : 'text-danger'}>{headerBar.c.toFixed(2)}</span></span>
          </div>
        )}
      </header>

      {error && (
        <div className="px-4 py-2 bg-danger/10 text-danger text-xs border-b border-danger/30">
          {error}
        </div>
      )}

      <main className="flex-1">
        {isLoading
          ? <div className="h-full flex items-center justify-center text-text-subtle">Loading {symbol} from Binance…</div>
          : <Chart symbol={symbol} timeframe={timeframe} bars={bars} />
        }
      </main>
    </div>
  );
}

function ConnectionDot({ connected, lastUpdate }: { connected: boolean; lastUpdate: number | null }): JSX.Element {
  const label = connected ? 'LIVE' : lastUpdate ? 'reconnecting…' : 'connecting…';
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-mono">
      <span className={`relative inline-flex w-2 h-2 rounded-full ${connected ? 'bg-accent' : 'bg-yellow-500'}`}>
        {connected && (
          <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-60" />
        )}
      </span>
      <span className={connected ? 'text-accent' : 'text-yellow-500'}>{label}</span>
    </span>
  );
}
