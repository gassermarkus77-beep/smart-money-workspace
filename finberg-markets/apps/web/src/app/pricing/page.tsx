import Link from 'next/link';
import { Check } from 'lucide-react';
import { SiteHeader } from '../../components/SiteHeader';
import { SiteFooter } from '../../components/SiteFooter';

const PLANS = [
  {
    name: 'Free',
    price: '$0',
    period: '/forever',
    blurb: 'Get a feel for the workspace.',
    cta: 'Start free',
    href: '/signup',
    features: [
      '1 chart per layout',
      '2 watchlists × 20 symbols',
      '3 indicators per chart',
      '5 active alerts',
      'Delayed equities, realtime crypto',
    ],
  },
  {
    name: 'Pro',
    price: '$24.95',
    period: '/month',
    blurb: 'For the active retail trader.',
    cta: 'Start 14-day trial',
    href: '/signup?plan=pro',
    featured: true,
    features: [
      '4-chart layouts',
      'Unlimited watchlists',
      '25 indicators per chart',
      '100 active alerts',
      'FinScript indicators',
      'Telegram / webhook alerts',
    ],
  },
  {
    name: 'Premium',
    price: '$49.95',
    period: '/month',
    blurb: 'AI + realtime everywhere.',
    cta: 'Start 14-day trial',
    href: '/signup?plan=premium',
    features: [
      '8-chart layouts',
      'Unlimited everything',
      'Realtime US equities',
      'FINBERG SMC AI included',
      'Volume Profile, Footprint',
      'Priority email support',
    ],
  },
  {
    name: 'Institutional',
    price: 'from $499',
    period: '/seat/mo',
    blurb: 'For desks and funds.',
    cta: 'Talk to sales',
    href: '/contact?plan=inst',
    features: [
      'SAML / OIDC SSO',
      'Audit log + SOC 2 report',
      'FIX 5.0 gateway',
      'Dedicated CSM + 99.95% SLA',
      'EU data residency / per-tenant KMS',
      'Custom data feeds',
    ],
  },
];

export default function PricingPage(): JSX.Element {
  return (
    <main className="min-h-screen flex flex-col">
      <SiteHeader />

      <section className="max-w-[1400px] mx-auto w-full px-6 py-16 flex-1">
        <header className="text-center">
          <h1 className="text-4xl font-semibold tracking-tight">Pricing</h1>
          <p className="mt-3 text-text-muted max-w-2xl mx-auto">
            Start free. Upgrade when you need more. Save 20% on annual plans.
          </p>
        </header>

        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PLANS.map(p => (
            <div
              key={p.name}
              className={`rounded-2xl border p-6 flex flex-col ${
                p.featured
                  ? 'border-accent bg-accent/5 shadow-lg shadow-accent/10'
                  : 'border-bg-elevated bg-bg'
              }`}
            >
              {p.featured && (
                <span className="self-start text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/15 px-2 py-0.5 rounded mb-2">
                  Most popular
                </span>
              )}
              <h3 className="text-lg font-semibold">{p.name}</h3>
              <p className="text-sm text-text-muted">{p.blurb}</p>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-semibold">{p.price}</span>
                <span className="text-sm text-text-muted">{p.period}</span>
              </div>

              <ul className="mt-6 space-y-2 text-sm flex-1">
                {p.features.map(f => (
                  <li key={f} className="flex gap-2 items-start">
                    <Check size={14} className="text-accent shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href={p.href}
                className={`mt-6 inline-flex items-center justify-center h-10 rounded-md text-sm font-semibold ${
                  p.featured
                    ? 'bg-accent hover:bg-accent-hover text-white'
                    : 'border border-bg-elevated hover:bg-bg-subtle'
                }`}
              >
                {p.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-xl border border-bg-elevated bg-bg-subtle/40 p-6 text-sm text-text-muted">
          <strong className="text-text">Fair use.</strong>{' '}
          We never charge for data we don&apos;t actually provide. If a market data vendor
          retracts a license tier, your plan auto-rolls to the closest equivalent — never
          stuck with a worse product than you paid for.
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
