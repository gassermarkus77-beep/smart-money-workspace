import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
import { MarketTicker } from '../../components/MarketTicker';

const BROKERS = [
  { name: 'Interactive Brokers', asset: 'Stocks · FX · Futures', region: 'Global', status: 'planned' },
  { name: 'Alpaca',             asset: 'US Equities · Crypto',   region: 'US',     status: 'planned' },
  { name: 'Binance',            asset: 'Spot · Futures',          region: 'Global', status: 'planned' },
  { name: 'Kraken',             asset: 'Crypto · Margin',         region: 'Global', status: 'planned' },
  { name: 'OANDA',              asset: 'FX · CFDs',               region: 'Global', status: 'planned' },
  { name: 'Tradier',            asset: 'Stocks · Options',        region: 'US',     status: 'planned' },
];

export default function BrokersPage(): JSX.Element {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <MarketTicker />

      <section className="max-w-[1200px] mx-auto w-full px-6 py-10 flex-1">
        <h1 className="text-3xl font-semibold tracking-tight">Brokers</h1>
        <p className="mt-2 text-text-muted">
          One-click connect to your broker and trade from the chart. Broker integrations land in v3.0.
        </p>

        <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {BROKERS.map(b => (
            <div key={b.name} className="rounded-xl border border-bg-elevated bg-bg p-5">
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-semibold">{b.name}</h3>
                <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded bg-bg-subtle text-text-muted">
                  {b.status}
                </span>
              </div>
              <div className="mt-2 text-sm text-text-muted">{b.asset}</div>
              <div className="mt-1 text-xs text-text-subtle">{b.region}</div>
              <button className="mt-4 w-full h-9 rounded border border-bg-elevated text-sm text-text-muted hover:bg-bg-subtle">
                Notify me on launch
              </button>
            </div>
          ))}
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
