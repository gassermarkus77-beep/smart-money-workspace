'use client';

// ============================================================================
// Watchlist panel — right-docked, TradingView-style. Live-updates last price
// and 24h % via the Binance combined ticker stream.
// ============================================================================

import { Plus, MoreHorizontal, LayoutGrid } from 'lucide-react';
import { useBinanceTickers } from '../lib/binance-tickers';

interface Group {
  label: string;
  symbols: string[];
}

const DEFAULT_GROUPS: Group[] = [
  {
    label: 'CRYPTO MAJORS',
    symbols: ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT'],
  },
  {
    label: 'CRYPTO ALTS',
    symbols: ['ADAUSDT', 'AVAXUSDT', 'DOGEUSDT', 'LINKUSDT', 'DOTUSDT', 'MATICUSDT'],
  },
  {
    label: 'CRYPTO L2 / NEW',
    symbols: ['ARBUSDT', 'OPUSDT', 'SUIUSDT', 'APTUSDT', 'TONUSDT'],
  },
];

const ALL_SYMBOLS = DEFAULT_GROUPS.flatMap(g => g.symbols);

export interface WatchlistProps {
  selected: string;
  onSelect: (symbol: string) => void;
}

export function Watchlist({ selected, onSelect }: WatchlistProps): JSX.Element {
  const tickers = useBinanceTickers(ALL_SYMBOLS);

  return (
    <aside className="w-[300px] border-l border-bg-elevated bg-bg flex flex-col overflow-hidden">
      <header className="px-3 py-2.5 flex items-center justify-between border-b border-bg-elevated">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold">Watchlist</span>
          <span className="text-text-subtle text-xs">▾</span>
        </div>
        <div className="flex items-center gap-1 text-text-subtle">
          <IconBtn title="Add"><Plus size={14} /></IconBtn>
          <IconBtn title="Layout"><LayoutGrid size={14} /></IconBtn>
          <IconBtn title="More"><MoreHorizontal size={14} /></IconBtn>
        </div>
      </header>

      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 px-3 py-1.5 text-[10px] text-text-subtle uppercase tracking-wider border-b border-bg-elevated">
        <span>Symbol</span><span className="text-right">Last</span><span className="text-right">Chg%</span>
      </div>

      <div className="flex-1 overflow-y-auto">
        {DEFAULT_GROUPS.map(g => (
          <section key={g.label}>
            <h3 className="px-3 py-1.5 text-[10px] font-semibold text-text-muted bg-bg-subtle/50">
              ▾ {g.label}
            </h3>
            {g.symbols.map(sym => {
              const t = tickers[sym];
              const isActive = sym === selected;
              const up = t ? t.changePct >= 0 : false;
              return (
                <button
                  key={sym}
                  onClick={() => onSelect(sym)}
                  className={`w-full grid grid-cols-[1fr_auto_auto] gap-x-3 items-center px-3 py-1.5 text-xs font-mono transition-colors ${
                    isActive ? 'bg-accent/10' : 'hover:bg-bg-elevated'
                  }`}
                >
                  <span className={`flex items-center gap-1.5 text-left ${isActive ? 'text-accent' : 'text-text'}`}>
                    <span className={`inline-block w-1.5 h-1.5 rounded-full ${t ? 'bg-accent' : 'bg-text-subtle/40'}`} />
                    {sym.replace(/USDT$/, '')}
                  </span>
                  <span className="text-right text-text">
                    {t ? formatPrice(t.last) : '—'}
                  </span>
                  <span className={`text-right ${t ? (up ? 'text-accent' : 'text-danger') : 'text-text-subtle'}`}>
                    {t ? `${up ? '+' : ''}${t.changePct.toFixed(2)}%` : '—'}
                  </span>
                </button>
              );
            })}
          </section>
        ))}
      </div>
    </aside>
  );
}

function IconBtn({ children, title }: { children: React.ReactNode; title: string }): JSX.Element {
  return (
    <button
      title={title}
      className="w-6 h-6 inline-flex items-center justify-center rounded hover:bg-bg-elevated hover:text-text"
    >
      {children}
    </button>
  );
}

function formatPrice(p: number): string {
  if (p >= 1000) return p.toFixed(2);
  if (p >= 1)    return p.toFixed(4);
  return p.toPrecision(5);
}
