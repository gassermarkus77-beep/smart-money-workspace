'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { ArrowUpDown, Search } from 'lucide-react';
import { SiteHeader }   from '../../components/SiteHeader';
import { SiteFooter }   from '../../components/SiteFooter';
import { MarketTicker } from '../../components/MarketTicker';
import { Sparkline }    from '../../components/Sparkline';
import { useBinanceTickers } from '../../lib/binance-tickers';

type Tab = 'crypto' | 'forex' | 'stocks' | 'indices' | 'commodities';

const CRYPTO = [
  { symbol: 'BTCUSDT', name: 'Bitcoin',     sector: 'Layer-1' },
  { symbol: 'ETHUSDT', name: 'Ethereum',    sector: 'Layer-1' },
  { symbol: 'SOLUSDT', name: 'Solana',      sector: 'Layer-1' },
  { symbol: 'BNBUSDT', name: 'BNB',         sector: 'Exchange' },
  { symbol: 'XRPUSDT', name: 'XRP',         sector: 'Payments' },
  { symbol: 'ADAUSDT', name: 'Cardano',     sector: 'Layer-1' },
  { symbol: 'AVAXUSDT', name: 'Avalanche',  sector: 'Layer-1' },
  { symbol: 'DOGEUSDT', name: 'Dogecoin',   sector: 'Meme' },
  { symbol: 'LINKUSDT', name: 'Chainlink',  sector: 'Oracle' },
  { symbol: 'DOTUSDT',  name: 'Polkadot',   sector: 'Layer-0' },
  { symbol: 'TRXUSDT',  name: 'TRON',       sector: 'Layer-1' },
  { symbol: 'MATICUSDT', name: 'Polygon',   sector: 'Layer-2' },
  { symbol: 'LTCUSDT',  name: 'Litecoin',   sector: 'Payments' },
  { symbol: 'NEARUSDT', name: 'NEAR',       sector: 'Layer-1' },
  { symbol: 'TONUSDT',  name: 'Toncoin',    sector: 'Layer-1' },
  { symbol: 'SUIUSDT',  name: 'Sui',        sector: 'Layer-1' },
  { symbol: 'APTUSDT',  name: 'Aptos',      sector: 'Layer-1' },
  { symbol: 'ATOMUSDT', name: 'Cosmos',     sector: 'Layer-0' },
  { symbol: 'ARBUSDT',  name: 'Arbitrum',   sector: 'Layer-2' },
  { symbol: 'OPUSDT',   name: 'Optimism',   sector: 'Layer-2' },
];

export default function MarketsPage(): JSX.Element {
  const [tab, setTab] = useState<Tab>('crypto');
  const [query, setQuery] = useState('');
  const [sortKey, setSortKey] = useState<'symbol' | 'last' | 'changePct'>('changePct');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  const tickers = useBinanceTickers(CRYPTO.map(c => c.symbol));

  const filtered = useMemo(() => {
    const rows = CRYPTO.filter(r =>
      r.symbol.toLowerCase().includes(query.toLowerCase()) ||
      r.name.toLowerCase().includes(query.toLowerCase()) ||
      r.sector.toLowerCase().includes(query.toLowerCase())
    );
    return rows.sort((a, b) => {
      const ta = tickers[a.symbol];
      const tb = tickers[b.symbol];
      let av: string | number = 0, bv: string | number = 0;
      switch (sortKey) {
        case 'symbol':    av = a.symbol; bv = b.symbol; break;
        case 'last':      av = ta?.last ?? 0; bv = tb?.last ?? 0; break;
        case 'changePct': av = ta?.changePct ?? 0; bv = tb?.changePct ?? 0; break;
      }
      if (av === bv) return 0;
      const cmp = av > bv ? 1 : -1;
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [query, sortKey, sortDir, tickers]);

  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <MarketTicker />

      <section className="max-w-[1600px] mx-auto w-full px-6 py-10 flex-1">
        <h1 className="text-3xl font-semibold tracking-tight">Markets</h1>
        <p className="mt-2 text-text-muted">
          Live prices streaming from public exchanges. Click a symbol to open it on Supercharts.
        </p>

        {/* Tabs */}
        <div className="mt-6 flex items-center justify-between gap-4 border-b border-bg-elevated">
          <div className="flex gap-1">
            {(['crypto', 'stocks', 'forex', 'indices', 'commodities'] as Tab[]).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  tab === t
                    ? 'border-accent text-text'
                    : 'border-transparent text-text-muted hover:text-text'
                }`}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
                {t !== 'crypto' && <span className="ml-1.5 text-[10px] text-text-subtle">(soon)</span>}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-72 hidden md:block">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter symbol, name, sector…"
              className="w-full h-9 pl-9 pr-3 rounded-md bg-bg-subtle text-sm border border-bg-elevated focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        {/* Body */}
        {tab !== 'crypto' ? (
          <div className="mt-12 text-center text-text-muted">
            <div className="inline-block px-4 py-2 rounded bg-bg-subtle">
              {tab[0]?.toUpperCase()}{tab.slice(1)} markets — coming with the equity data provider integration.
            </div>
          </div>
        ) : (
          <div className="mt-6 rounded-xl border border-bg-elevated bg-bg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-text-subtle text-xs uppercase tracking-wider border-b border-bg-elevated">
                  <ThSort label="Symbol" k="symbol" current={sortKey} dir={sortDir} setSort={(k, d) => { setSortKey(k); setSortDir(d); }} />
                  <th className="px-4 py-3 hidden sm:table-cell">Sector</th>
                  <ThSort label="Last" k="last" align="right" current={sortKey} dir={sortDir} setSort={(k, d) => { setSortKey(k); setSortDir(d); }} />
                  <ThSort label="24h %" k="changePct" align="right" current={sortKey} dir={sortDir} setSort={(k, d) => { setSortKey(k); setSortDir(d); }} />
                  <th className="px-4 py-3 hidden md:table-cell text-right">24h trend</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const t = tickers[r.symbol];
                  const up = t ? t.changePct >= 0 : false;
                  return (
                    <tr key={r.symbol} className="border-b border-bg-elevated last:border-0 hover:bg-bg-subtle/40">
                      <td className="px-4 py-3">
                        <Link href={`/chart?symbol=${r.symbol}`} className="flex items-center gap-3 hover:text-accent">
                          <span className="w-8 h-8 rounded-full bg-orange-500/20 text-orange-500 flex items-center justify-center text-xs font-bold">
                            {r.symbol[0]}
                          </span>
                          <div>
                            <div className="font-semibold">{r.symbol.replace(/USDT$/, '')}</div>
                            <div className="text-xs text-text-muted">{r.name}</div>
                          </div>
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-text-muted hidden sm:table-cell">{r.sector}</td>
                      <td className="px-4 py-3 text-right font-mono">{t ? fmt(t.last) : '—'}</td>
                      <td className={`px-4 py-3 text-right font-mono ${t ? (up ? 'text-accent' : 'text-danger') : 'text-text-subtle'}`}>
                        {t ? `${up ? '+' : ''}${t.changePct.toFixed(2)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        <div className="inline-block"><Sparkline symbol={r.symbol} /></div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/chart?symbol=${r.symbol}`} className="text-xs text-accent hover:underline">
                          Open →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-12 text-center text-text-subtle">No matches.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <SiteFooter />
    </main>
  );
}

function ThSort({ label, k, align, current, dir, setSort }: {
  label: string;
  k: 'symbol' | 'last' | 'changePct';
  align?: 'right';
  current: 'symbol' | 'last' | 'changePct';
  dir: 'asc' | 'desc';
  setSort: (k: 'symbol' | 'last' | 'changePct', d: 'asc' | 'desc') => void;
}): JSX.Element {
  const active = current === k;
  const next: 'asc' | 'desc' = active && dir === 'desc' ? 'asc' : 'desc';
  return (
    <th className={`px-4 py-3 ${align === 'right' ? 'text-right' : ''}`}>
      <button
        onClick={() => setSort(k, next)}
        className={`inline-flex items-center gap-1 ${active ? 'text-text' : ''} hover:text-text`}
      >
        {label}
        <ArrowUpDown size={11} className="opacity-50" />
      </button>
    </th>
  );
}

function fmt(p: number): string {
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1)    return p.toFixed(4);
  return p.toPrecision(5);
}
