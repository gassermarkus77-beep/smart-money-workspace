import Link from 'next/link';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
import { MarketTicker } from '../../components/MarketTicker';

const FEED = [
  { time: '2m ago',  source: 'CoinDesk',    title: 'Bitcoin reclaims $68k as ETF flows hit weekly record', tag: 'CRYPTO' },
  { time: '17m ago', source: 'Bloomberg',   title: 'Fed minutes: officials saw inflation progress slowing', tag: 'MACRO' },
  { time: '34m ago', source: 'Reuters',     title: 'ECB holds rates, signals cuts dependent on services CPI', tag: 'FOREX' },
  { time: '1h ago',  source: 'The Block',   title: 'Spot ETH ETF options approved by SEC', tag: 'CRYPTO' },
  { time: '2h ago',  source: 'FT',          title: 'Brent crude climbs as OPEC+ extends voluntary cuts', tag: 'COMMODITIES' },
  { time: '3h ago',  source: 'Cointelegraph', title: 'Layer-2 TVL hits new ATH; Arbitrum leads with 40% share', tag: 'CRYPTO' },
  { time: '5h ago',  source: 'WSJ',         title: 'US Treasury yields steady ahead of NFP print', tag: 'BONDS' },
  { time: '6h ago',  source: 'CNBC',        title: 'Nvidia tops $3T market cap as AI capex narrative holds', tag: 'STOCKS' },
];

export default function NewsPage(): JSX.Element {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <MarketTicker />

      <section className="max-w-[1200px] mx-auto w-full px-6 py-10 flex-1">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">News</h1>
            <p className="mt-2 text-text-muted">Curated market-moving headlines.</p>
          </div>
          <div className="flex gap-2 text-xs">
            {['All', 'Crypto', 'Stocks', 'Forex', 'Macro', 'Commodities'].map((t, i) => (
              <button key={t} className={`px-3 py-1.5 rounded-md ${i === 0 ? 'bg-accent/15 text-accent' : 'text-text-muted hover:text-text hover:bg-bg-subtle'}`}>{t}</button>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-bg-elevated divide-y divide-bg-elevated">
          {FEED.map((n, i) => (
            <Link key={i} href="#" className="flex items-start gap-4 p-4 hover:bg-bg-subtle/40">
              <span className="shrink-0 text-[10px] font-semibold tracking-wider text-accent bg-accent/10 px-2 py-1 rounded">
                {n.tag}
              </span>
              <div className="flex-1">
                <h3 className="font-medium text-text">{n.title}</h3>
                <div className="mt-1 flex items-center gap-3 text-xs text-text-muted">
                  <span>{n.source}</span>
                  <span>· {n.time}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        <p className="mt-6 text-xs text-text-subtle">
          Live news aggregation ships with the Finnhub + Reuters integrations — these are placeholders.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
