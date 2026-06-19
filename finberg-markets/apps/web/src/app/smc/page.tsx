'use client';

// ============================================================================
// FINBERG SMC AI — Analysis workspace
// Chart + SMC overlay + scenario panel + detection legend
// ============================================================================

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import type { Bar, Timeframe } from '@finberg/shared/market';
import type { Scenario, SmcEvent } from '@finberg/ui/smc';
import { ScenarioPanel, DetectionLegend } from '@finberg/ui/smc';

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
  const [bars, setBars] = useState<Record<Timeframe, Bar[]>>({} as Record<Timeframe, Bar[]>);
  const [scenario, setScenario] = useState<Scenario | null>(null);
  const [events, setEvents] = useState<SmcEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Set<SmcEvent['kind']>>(new Set(ALL_KINDS));

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    (async () => {
      const allBars: Record<Timeframe, Bar[]> = {} as Record<Timeframe, Bar[]>;
      for (const tf of [...HTF, LTF]) {
        const to = Date.now();
        const lookbackMs = tf === '1d' ? 365 * 86_400_000 : tf === '4h' ? 90 * 86_400_000 : tf === '1h' ? 30 * 86_400_000 : 7 * 86_400_000;
        const from = to - lookbackMs;
        try {
          const r = await fetch(`/api/proxy/market/bars?symbol=${symbol}&timeframe=${tf}&from=${from}&to=${to}&limit=1500`);
          allBars[tf] = r.ok ? await r.json() : synthBars(symbol, tf, 800);
        } catch {
          allBars[tf] = synthBars(symbol, tf, 800);
        }
      }
      if (cancelled) return;
      setBars(allBars);

      try {
        const res = await fetch('/api/proxy/smc/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            symbol, assetClass: 'crypto',
            bars: allBars, entryTimeframe: LTF, htfTimeframes: HTF,
            timezone: 'UTC', upgradeCommentary: false,
          }),
        });
        if (!res.ok) throw new Error('analyze failed');
        const json = await res.json() as { scenario: Scenario | null; ltfState: { events: SmcEvent[] }; htfStates: Array<{ events: SmcEvent[] }> };
        if (cancelled) return;
        setScenario(json.scenario);
        const all = [...json.ltfState.events, ...json.htfStates.flatMap(s => s.events)];
        setEvents(all);
      } catch {
        if (!cancelled) { setScenario(null); setEvents([]); }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [symbol]);

  const ltfBars = useMemo(() => bars[LTF] ?? [], [bars]);
  const visibleEvents = useMemo(() => events.filter(e => active.has(e.kind)), [events, active]);

  const refresh = (): void => setSymbol(s => s);   // re-trigger effect via setState cycle

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
          className="bg-bg-subtle text-text px-3 py-1.5 rounded font-mono text-sm border border-bg-elevated focus:outline-none focus:ring-2 focus:ring-accent w-32"
        />
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

      <main className="flex-1 flex">
        <div className="flex-1 relative">
          {ltfBars.length > 0 && <Chart symbol={symbol} timeframe={LTF} bars={ltfBars} />}
          {/* TODO: align SmcOverlay positioning to ChartEngine viewport */}
          <div className="absolute top-2 left-2 text-[10px] text-text-subtle font-mono opacity-70">
            {events.length} events ({visibleEvents.length} visible)
          </div>
        </div>
        <ScenarioPanel scenario={scenario} loading={loading} onRefresh={refresh} />
      </main>
    </div>
  );
}

function synthBars(symbol: string, tf: Timeframe, n: number): Bar[] {
  const stepMs: Partial<Record<Timeframe, number>> = {
    '15m': 900_000, '1h': 3_600_000, '4h': 14_400_000, '1d': 86_400_000,
  };
  const step = stepMs[tf] ?? 3_600_000;
  let p = 100 + (hash(symbol) % 1000);
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
