'use client';

// ============================================================================
// MarketTicker — TradingView-style horizontal scrolling tape with live prices.
// Streams 20 top crypto pairs via the Binance combined ticker WebSocket.
// ============================================================================

import Link from 'next/link';
import { useBinanceTickers } from '../lib/binance-tickers';

const TAPE_SYMBOLS = [
  'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT',
  'ADAUSDT','DOGEUSDT','AVAXUSDT','LINKUSDT','DOTUSDT',
  'TRXUSDT','MATICUSDT','LTCUSDT','NEARUSDT','TONUSDT',
  'SUIUSDT','APTUSDT','ATOMUSDT','ARBUSDT','OPUSDT',
];

export function MarketTicker(): JSX.Element {
  const tickers = useBinanceTickers(TAPE_SYMBOLS);

  return (
    <div className="h-9 border-b border-bg-elevated bg-bg-subtle/40 overflow-hidden">
      <div className="h-full flex items-center animate-[marquee_60s_linear_infinite] whitespace-nowrap">
        {[...TAPE_SYMBOLS, ...TAPE_SYMBOLS].map((sym, i) => {
          const t = tickers[sym];
          const up = t ? t.changePct >= 0 : false;
          return (
            <Link
              key={`${sym}-${i}`}
              href={`/chart?symbol=${sym}`}
              className="inline-flex items-center gap-2 px-5 text-xs hover:bg-bg-elevated h-full"
            >
              <span className="font-semibold text-text">{sym.replace(/USDT$/, '/USDT')}</span>
              <span className="font-mono text-text-muted">
                {t ? formatPrice(t.last) : '—'}
              </span>
              <span className={`font-mono ${t ? (up ? 'text-accent' : 'text-danger') : 'text-text-subtle'}`}>
                {t ? `${up ? '▲' : '▼'} ${Math.abs(t.changePct).toFixed(2)}%` : ''}
              </span>
            </Link>
          );
        })}
      </div>

      <style jsx global>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
      `}</style>
    </div>
  );
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1)    return p.toFixed(4);
  return p.toPrecision(5);
}
