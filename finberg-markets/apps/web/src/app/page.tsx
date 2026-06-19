import Link from 'next/link';
import { ArrowRight, ChevronRight, Sparkles, LineChart, BellRing, Users } from 'lucide-react';
import { SiteHeader }   from '../components/SiteHeader';
import { SiteFooter }   from '../components/SiteFooter';
import { MarketTicker } from '../components/MarketTicker';
import { LandingMarketsTable } from '../components/LandingMarketsTable';

export default function HomePage(): JSX.Element {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />
      <MarketTicker />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="max-w-[1400px] mx-auto px-6 pt-16 pb-24 grid lg:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium">
              <Sparkles size={12} /> FINBERG SMC AI — now in public beta
            </span>
            <h1 className="mt-6 text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
              Look first /<br />
              <span className="text-accent">Then leap.</span>
            </h1>
            <p className="mt-6 text-lg text-text-muted max-w-xl leading-relaxed">
              The trading workspace where the world charts. Realtime multi-asset data, an AI engine
              that reads Smart Money structure for you, and a scripting layer powerful enough to
              express any strategy.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/chart" className="inline-flex items-center gap-2 h-12 px-6 rounded-md bg-accent hover:bg-accent-hover text-white font-semibold">
                Get started — it&apos;s free <ArrowRight size={16} />
              </Link>
              <Link href="/smc" className="inline-flex items-center h-12 px-6 rounded-md border border-bg-elevated hover:bg-bg-subtle font-medium">
                Try SMC AI →
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs text-text-subtle">
              <span>★ 4.8 / 5 on stores</span>
              <span>· 100M+ tracked instruments</span>
              <span>· No card required</span>
            </div>
          </div>

          {/* Hero visual — fake chart card */}
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl border border-bg-elevated bg-gradient-to-br from-bg-subtle to-bg shadow-2xl overflow-hidden">
              <div className="h-10 border-b border-bg-elevated px-3 flex items-center gap-3 text-xs text-text-muted">
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/70" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/70" />
                </div>
                <span className="font-mono">BTCUSDT · 1h · Binance</span>
                <span className="ml-auto flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                  <span className="text-accent">LIVE</span>
                </span>
              </div>
              <FakeChart />
            </div>
            {/* Floating SMC badge */}
            <div className="absolute -bottom-4 -left-4 px-4 py-3 rounded-xl bg-bg-elevated border border-bg-subtle shadow-xl">
              <div className="text-[10px] uppercase tracking-wider text-text-muted">SMC AI</div>
              <div className="text-sm font-semibold mt-0.5">Bullish MSS on M15</div>
              <div className="text-xs text-accent mt-1">Confidence 78%</div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="border-y border-bg-elevated bg-bg-subtle/40 py-6">
        <div className="max-w-[1400px] mx-auto px-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-3 text-xs text-text-subtle uppercase tracking-wider">
          <span>Polygon.io data</span>
          <span>·  Binance feed</span>
          <span>·  Anthropic Claude</span>
          <span>·  AWS infrastructure</span>
          <span>·  SOC 2 in progress</span>
        </div>
      </section>

      {/* MARKETS GRID */}
      <section className="py-20">
        <div className="max-w-[1400px] mx-auto px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Markets — live</h2>
              <p className="mt-2 text-text-muted">Streaming from Binance public WebSocket.</p>
            </div>
            <Link href="/markets/crypto" className="text-sm text-accent hover:underline flex items-center gap-1">
              All markets <ChevronRight size={14} />
            </Link>
          </div>
          <LandingMarketsTable />
        </div>
      </section>

      {/* FEATURES */}
      <section className="py-24 bg-bg-subtle/30 border-y border-bg-elevated">
        <div className="max-w-[1400px] mx-auto px-6">
          <h2 className="text-3xl font-semibold tracking-tight text-center">Built for serious traders</h2>
          <p className="mt-3 text-center text-text-muted max-w-2xl mx-auto">
            Six pillars that make FINBERG the workspace institutions trust — and retail traders graduate to.
          </p>

          <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Feature
              icon={<LineChart size={20} />}
              title="Microsecond charts"
              body="Custom Canvas/WebGL engine sustains 60 fps under 250k visible bars. Crosshair sync across panes, multi-monitor support."
            />
            <Feature
              icon={<Sparkles size={20} />}
              title="FINBERG SMC AI"
              body="Auto-detects FVG, Order Blocks, BOS, CHOCH and liquidity sweeps. Generates trading scenarios with explained confidence scores."
            />
            <Feature
              icon={<BellRing size={20} />}
              title="Alerts that fire fast"
              body="Sub-second trigger-to-dispatch across in-app, email, Telegram, webhook and push. Idempotent, deduplicated."
            />
            <Feature
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h10" /></svg>}
              title="FinScript indicators"
              body="A Pine-Script-class DSL compiled to sandboxed ES2022. Build, share, and monetize indicators in the marketplace."
            />
            <Feature
              icon={<Users size={20} />}
              title="Community of analysts"
              body="Publish ideas with structured entry/stop/target. Follow traders whose ideas actually print. Reputation tied to outcomes."
            />
            <Feature
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 9h6v6H9z" /></svg>}
              title="Institutional grade"
              body="SAML SSO, audit trail, FIX gateway, dedicated CSM. Per-tenant KMS keys. EU data residency."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-semibold tracking-tight">Charts open in 2 seconds.</h2>
          <p className="mt-4 text-text-muted text-lg">No card. No trial countdown. Just open the workspace.</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link href="/chart" className="inline-flex items-center gap-2 h-12 px-7 rounded-md bg-accent hover:bg-accent-hover text-white font-semibold">
              Open Supercharts <ArrowRight size={16} />
            </Link>
            <Link href="/pricing" className="inline-flex items-center h-12 px-7 rounded-md border border-bg-elevated hover:bg-bg-subtle font-medium">
              See pricing
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function Feature({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-bg-elevated bg-bg p-6 hover:border-accent/30 transition-colors">
      <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent flex items-center justify-center">{icon}</div>
      <h3 className="mt-4 text-lg font-medium">{title}</h3>
      <p className="mt-2 text-sm text-text-muted leading-relaxed">{body}</p>
    </div>
  );
}

/** Pure-SVG decorative chart for the hero — no data, just shape. */
function FakeChart(): JSX.Element {
  const path = "M0 220 L30 200 L60 190 L90 215 L120 180 L150 195 L180 160 L210 175 L240 145 L270 150 L300 120 L330 135 L360 110 L390 90 L420 105 L450 70 L480 85 L510 60 L540 75";
  return (
    <svg viewBox="0 0 540 270" className="w-full h-full">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#26a69a" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#26a69a" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* grid */}
      {[0, 60, 120, 180, 240].map(y => (
        <line key={y} x1="0" x2="540" y1={y} y2={y} stroke="#1a2332" strokeWidth="0.5" />
      ))}
      <path d={`${path} L540 270 L0 270 Z`} fill="url(#grad)" />
      <path d={path} fill="none" stroke="#26a69a" strokeWidth="2" />
    </svg>
  );
}
