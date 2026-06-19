import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';
import { MarketTicker } from '../../components/MarketTicker';

const IDEAS = [
  {
    author: 'Aria Volkov',     handle: 'avolkov',  reputation: 982,
    symbol: 'BTCUSDT', tf: '4H', bias: 'long' as const, rr: 4.2,
    title: 'BTC reclaims H4 OB → expecting expansion to 72k',
    body:  'H4 swept Asia low, MSS confirmed on M15, premium target above PWH at 72,200.',
    likes: 318, comments: 47, age: '2h',
  },
  {
    author: 'Marco Sato',      handle: 'msato',    reputation: 1410,
    symbol: 'ETHUSDT', tf: '1D', bias: 'short' as const, rr: 2.8,
    title: 'ETH rejected from D1 premium — short the retrace',
    body:  'D1 closed back inside the dealing range. Looking to short the H1 FVG fill at 3,580.',
    likes: 207, comments: 22, age: '5h',
  },
  {
    author: 'Lina Petrova',    handle: 'lpetrova', reputation: 624,
    symbol: 'SOLUSDT', tf: '15m', bias: 'long' as const, rr: 3.5,
    title: 'SOL low-resistance liquidity run set up',
    body:  'EQL cleared on M5, M15 OB unmitigated. Target external H1 liquidity.',
    likes: 144, comments: 18, age: '6h',
  },
];

export default function IdeasPage(): JSX.Element {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <MarketTicker />

      <section className="max-w-[1200px] mx-auto w-full px-6 py-10 flex-1">
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Ideas</h1>
            <p className="mt-2 text-text-muted">Trading ideas from the FINBERG community.</p>
          </div>
          <button className="h-10 px-4 rounded-md bg-accent text-white text-sm font-semibold hover:bg-accent-hover">
            Publish idea
          </button>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {IDEAS.map((i, k) => (
            <article key={k} className="rounded-xl border border-bg-elevated bg-bg p-5 hover:border-accent/30">
              <header className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-accent/20 text-accent flex items-center justify-center font-semibold">
                    {i.author[0]}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{i.author}</div>
                    <div className="text-xs text-text-muted">@{i.handle} · ★ {i.reputation}</div>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded ${i.bias === 'long' ? 'bg-accent/15 text-accent' : 'bg-danger/15 text-danger'}`}>
                  {i.bias.toUpperCase()} {i.rr}R
                </span>
              </header>
              <div className="mt-4 flex items-center gap-3 text-xs font-mono text-text-muted">
                <span className="font-semibold text-text">{i.symbol}</span>
                <span>· {i.tf}</span>
              </div>
              <h3 className="mt-2 text-lg font-medium leading-snug">{i.title}</h3>
              <p className="mt-2 text-sm text-text-muted leading-relaxed">{i.body}</p>
              <footer className="mt-4 pt-3 border-t border-bg-elevated flex items-center justify-between text-xs text-text-muted">
                <div className="flex items-center gap-4">
                  <span>❤ {i.likes}</span>
                  <span>💬 {i.comments}</span>
                </div>
                <span>{i.age} ago</span>
              </footer>
            </article>
          ))}
        </div>

        <p className="mt-6 text-xs text-text-subtle">
          Sample ideas. The social network ships in v1.0 — see docs/architecture for details.
        </p>
      </section>

      <SiteFooter />
    </main>
  );
}
