'use client';

import Link from 'next/link';
import { useBinanceTickers } from '../lib/binance-tickers';
import { Sparkline } from './Sparkline';

const ROWS = [
  { symbol: 'BTCUSDT', name: 'Bitcoin' },
  { symbol: 'ETHUSDT', name: 'Ethereum' },
  { symbol: 'SOLUSDT', name: 'Solana' },
  { symbol: 'BNBUSDT', name: 'BNB' },
  { symbol: 'XRPUSDT', name: 'XRP' },
  { symbol: 'ADAUSDT', name: 'Cardano' },
  { symbol: 'AVAXUSDT', name: 'Avalanche' },
  { symbol: 'LINKUSDT', name: 'Chainlink' },
];

export function LandingMarketsTable(): JSX.Element {
  const tickers = useBinanceTickers(ROWS.map(r => r.symbol));

  return (
    <div className="rounded-xl border border-bg-elevated bg-bg overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-text-subtle text-xs uppercase tracking-wider border-b border-bg-elevated">
            <th className="px-4 py-3 font-semibold">Symbol</th>
            <th className="px-4 py-3 font-semibold text-right">Last</th>
            <th className="px-4 py-3 font-semibold text-right">24h chg</th>
            <th className="px-4 py-3 font-semibold text-right">24h chg %</th>
            <th className="px-4 py-3 font-semibold text-right hidden md:table-cell">24h trend</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {ROWS.map(r => {
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
                <td className="px-4 py-3 text-right font-mono">{t ? fmt(t.last) : '—'}</td>
                <td className={`px-4 py-3 text-right font-mono ${t ? (up ? 'text-accent' : 'text-danger') : 'text-text-subtle'}`}>
                  {t ? `${up ? '+' : ''}${t.change.toFixed(2)}` : '—'}
                </td>
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
        </tbody>
      </table>
    </div>
  );
}

function fmt(p: number): string {
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1)    return p.toFixed(4);
  return p.toPrecision(5);
}
