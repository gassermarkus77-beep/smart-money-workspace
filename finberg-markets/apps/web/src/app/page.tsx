import Link from 'next/link';

export default function HomePage(): JSX.Element {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-bg-elevated">
        <nav className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-accent" />
            <span className="font-semibold tracking-tight">FINBERG MARKETS</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-text-muted">
            <Link href="/chart" className="hover:text-text">Charts</Link>
            <Link href="/scanner" className="hover:text-text">Scanner</Link>
            <Link href="/social" className="hover:text-text">Community</Link>
            <Link href="/login" className="hover:text-text">Sign in</Link>
            <Link
              href="/signup"
              className="px-3 py-1.5 rounded-md bg-accent text-white hover:bg-accent-hover"
            >
              Get started
            </Link>
          </div>
        </nav>
      </header>

      <section className="flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-6 py-24 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <h1 className="text-5xl lg:text-6xl font-semibold tracking-tight leading-tight">
              The trading workspace<br />
              <span className="text-accent">institutions</span> trust.
            </h1>
            <p className="mt-6 text-lg text-text-muted max-w-xl">
              Realtime multi-asset charts, an AI engine that reads Smart Money structure
              for you, and a scripting layer powerful enough to express any strategy.
              Built for traders who refuse to compromise.
            </p>
            <div className="mt-10 flex gap-4">
              <Link
                href="/chart"
                className="px-6 py-3 rounded-md bg-accent text-white hover:bg-accent-hover font-medium"
              >
                Open the workspace
              </Link>
              <Link
                href="/signup"
                className="px-6 py-3 rounded-md border border-bg-elevated hover:bg-bg-subtle font-medium"
              >
                Start free trial
              </Link>
            </div>
          </div>

          <div className="aspect-video rounded-xl border border-bg-elevated bg-bg-subtle flex items-center justify-center text-text-subtle">
            chart preview
          </div>
        </div>
      </section>

      <section className="border-t border-bg-elevated">
        <div className="max-w-7xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
          <Feature title="Realtime, every asset" body="Stocks, FX, crypto, indices, commodities, bonds — one workspace, microsecond ticks." />
          <Feature title="AI that reads structure" body="Auto-detection of FVGs, Order Blocks, BOS, CHOCH, and liquidity sweeps across every timeframe." />
          <Feature title="FinScript" body="Pine-Script-class indicator language with a sandboxed runtime and a public marketplace." />
        </div>
      </section>

      <footer className="border-t border-bg-elevated mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 text-sm text-text-subtle flex justify-between">
          <span>© {new Date().getFullYear()} FINBERG MARKETS</span>
          <span>Markets, mastered.</span>
        </div>
      </footer>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }): JSX.Element {
  return (
    <div>
      <h3 className="text-lg font-medium">{title}</h3>
      <p className="mt-2 text-text-muted text-sm">{body}</p>
    </div>
  );
}
