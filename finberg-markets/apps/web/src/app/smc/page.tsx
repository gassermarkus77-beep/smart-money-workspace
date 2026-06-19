'use client';

// ============================================================================
// FINBERG SMC AI — Analysis workspace
//
// On Vercel:
//   - LTF (15m) bars stream live from Binance WebSocket
//   - HTF (1h/4h/1d) bars fetched once via REST per symbol change
//   - SMC analyze endpoint is attempted; if the backend isn't deployed the
//     overlay stays empty and the panel shows "no scenario" — chart still
//     useful for manual analysis
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Bar, Timeframe } from '@finberg/shared/market';
import type { Scenario, SmcEvent } from '@finberg/ui/smc';
import { ScenarioPanel, DetectionLegend } from '@finberg/ui/smc';
import { fetchBinanceBars, POPULAR_SYMBOLS } from '../../lib/binance';
import { useBinanceLiveBars } from '../../lib/binance-stream';

const Chart = dynamic(() => import('@finberg/ui').then(m => ({ default: m.Chart })), {
  ssr: false,
  loading: () => <div className="h-full flex items-center justify-center text-text-subtle">Loading chart…</div>,
});

const ALL_KINDS: SmcEvent['kind'][] = [
  'FVG', 'OB', 'BB', 'PD_ZONE', 'LIQ_SWEEP',
  'BOS', 'CHOCH', 'MSS', 'EQH', 'EQL',
  'PDH', 'PDL', 'PWH', 'PWL', 'ASIA_H', 'ASIA_L',
];

const HTF: Timeframe[] = ['1h', '4h', '1d'];
const LTF: Timeframe = '15m';

export default function SmcPage(): JSX.Element {
  const [symbol, setSymbol] = useState('BTCUSDT');
  const [htfBars, setHtfBars] = useState<Record<Timeframe, Bar[]>>({} as Record<Timeframe, Bar[]>);
  const [htfLoading, setHtfLoading] = useState(true);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [events, setEvents] = useState<SmcEvent[]>([]);
  const [active, setActive] = useState<Set<SmcEvent['kind']>>(new Set(ALL_KINDS));

  // LTF streams live; HTF refreshes per symbol change
  const live = useBinanceLiveBars(symbol, LTF, 500);

  // HTF backfill
  useEffect(() => {
    let cancelled = false;
    setHtfLoading(true);
    Promise.all(
      HTF.map(async (tf) => {
        try { return { tf, bars: await fetchBinanceBars(symbol, tf, 500) }; }
        catch { return { tf, bars: [] as Bar[] }; }
      }),
    ).then((rs) => {
      if (cancelled) return;
      const acc: Record<Timeframe, Bar[]> = {} as Record<Timeframe, Bar[]>;
      for (const r of rs) acc[r.tf] = r.bars;
      setHtfBars(acc);
      setHtfLoading(false);
    });
    return () => { cancelled = true; };
  }, [symbol]);

  // SMC analyze — try backend (will fail on Vercel, that's OK)
  useEffect(() => {
    if (live.bars.length === 0 || htfLoading) return;
    let cancelled = false;
    (async () => {
      try {
        const body = {
          symbol, assetClass: 'crypto',
          bars: { ...htfBars, [LTF]: live.bars },
          entryTimeframe: LTF, htfTimeframes: HTF,
          timezone: 'UTC', upgradeCommentary: false,
        };
        const res = await fetch('/api/proxy/smc/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error('analyze unavailable');
        const json = await res.json() as {
          scenario: Scenario | null;
          ltfState: { events: SmcEvent[] };
          htfStates: Array<{ events: SmcEvent[] }>;
        };
        if (cancelled) return;
        setScenario(json.scenario);
        setEvents([...json.ltfState.events, ...json.htfStates.flatMap(s => s.events)]);
      } catch {
        if (!cancelled) { setScenario(null); setEvents([]); }
      }
    })();
    return () => { cancelled = true; };
  // Re-run only on symbol change or when HTF finishes loading; the live LTF
  // updates are too frequent to trigger a new analyze every tick.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, htfLoading]);

  const visibleEvents = useMemo(() => events.filter(e => active.has(e.kind)), [events, active]);
  const lastBar = live.bars.at(-1);
  const isLoading = live.bars.length === 0 && !live.error;

  return (
    <div className="h-screen flex flex-col">
      <header className="h-14 px-4 border-b border-bg-elevated flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-accent" />
          <h1 className="text-sm font-semibold tracking-wide">FINBERG SMC AI</h1>
        </div>

        <input
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          list="finberg-smc-symbols"
          spellCheck={false}
          className="bg-bg-subtle text-text px-3 py-1.5 rounded font-mono text-sm border border-bg-elevated focus:outline-none focus:ring-2 focus:ring-accent w-32"
        />
        <datalist id="finberg-smc-symbols">
          {POPULAR_SYMBOLS.map(s => <option key={s} value={s} />)}
        </datalist>

        <ConnectionDot connected={live.connected} />

        {lastBar && (
          <span className="font-mono text-xs text-text-muted">
            {lastBar.c.toFixed(2)}{' '}
            <span className={lastBar.c >= lastBar.o ? 'text-accent' : 'text-danger'}>
              ({(((lastBar.c - lastBar.o) / lastBar.o) * 100).toFixed(2)}%)
            </span>
          </span>
        )}

        <div className="ml-2 flex-1 overflow-x-auto">
          <DetectionLegend active={active} onToggle={(k) => {
            setActive(prev => {
              const next = new Set(prev);
              if (next.has(k)) next.delete(k); else next.add(k);
              return next;
            });
          }} />
        </div>
      </header>

      {live.error && (
        <div className="px-4 py-2 bg-danger/10 text-danger text-xs border-b border-danger/30">
          {live.error}
        </div>
      )}

      <main className="flex-1 flex">
        <div className="flex-1 relative">
          {isLoading
            ? <div className="h-full flex items-center justify-center text-text-subtle">Loading {symbol} from Binance…</div>
            : <Chart symbol={symbol} timeframe={LTF} bars={live.bars} />
          }
          <div className="absolute top-2 left-2 text-[10px] text-text-subtle font-mono opacity-70">
            {events.length === 0
              ? 'SMC backend offline — live Binance WebSocket only'
              : `${events.length} events (${visibleEvents.length} visible)`}
          </div>
        </div>
        <ScenarioPanel
          scenario={scenario}
          loading={isLoading || htfLoading}
          onRefresh={() => setSymbol(s => s)}
        />
      </main>
    </div>
  );
}

function ConnectionDot({ connected }: { connected: boolean }): JSX.Element {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-mono">
      <span className={`relative inline-flex w-2 h-2 rounded-full ${connected ? 'bg-accent' : 'bg-yellow-500'}`}>
        {connected && (
          <span className="absolute inset-0 rounded-full bg-accent animate-ping opacity-60" />
        )}
      </span>
      <span className={connected ? 'text-accent' : 'text-yellow-500'}>
        {connected ? 'LIVE' : 'connecting…'}
      </span>
    </span>
  );
}
