import Link from 'next/link';

const COLS: Array<{ title: string; links: Array<{ label: string; href: string }> }> = [
  {
    title: 'Products',
    links: [
      { label: 'Supercharts', href: '/chart' },
      { label: 'FINBERG SMC AI', href: '/smc' },
      { label: 'Scanner', href: '/scanner' },
      { label: 'Alerts', href: '/alerts' },
      { label: 'Mobile app', href: '/mobile' },
    ],
  },
  {
    title: 'Community',
    links: [
      { label: 'Ideas', href: '/ideas' },
      { label: 'Streams', href: '/streams' },
      { label: 'Wall of fame', href: '/wall' },
      { label: 'Refer a friend', href: '/refer' },
    ],
  },
  {
    title: 'Markets',
    links: [
      { label: 'Crypto', href: '/markets/crypto' },
      { label: 'Stocks', href: '/markets/stocks' },
      { label: 'Forex', href: '/markets/forex' },
      { label: 'Indices', href: '/markets/indices' },
      { label: 'Commodities', href: '/markets/commodities' },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About', href: '/about' },
      { label: 'Careers', href: '/careers' },
      { label: 'Press', href: '/press' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Contact', href: '/contact' },
    ],
  },
  {
    title: 'For developers',
    links: [
      { label: 'API docs', href: '/docs/api' },
      { label: 'FinScript', href: '/docs/finscript' },
      { label: 'Status', href: '/status' },
      { label: 'Changelog', href: '/changelog' },
    ],
  },
];

export function SiteFooter(): JSX.Element {
  return (
    <footer className="bg-bg-subtle/40 border-t border-bg-elevated">
      <div className="max-w-[1600px] mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-8">
          <div className="col-span-2 md:col-span-3 lg:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-accent flex items-center justify-center font-bold text-white text-sm">F</div>
              <span className="font-semibold tracking-tight">FINBERG MARKETS</span>
            </div>
            <p className="mt-3 text-xs text-text-muted leading-relaxed">
              Institutional-grade charting and analysis for traders, investors and analysts worldwide.
            </p>
          </div>

          {COLS.map(col => (
            <div key={col.title}>
              <h4 className="text-xs uppercase tracking-wider text-text-subtle font-semibold">{col.title}</h4>
              <ul className="mt-3 space-y-2">
                {col.links.map(l => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sm text-text-muted hover:text-text">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 pt-6 border-t border-bg-elevated flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-text-subtle">
          <span>© {new Date().getFullYear()} FINBERG MARKETS. Analysis, not financial advice.</span>
          <div className="flex gap-4">
            <Link href="/terms" className="hover:text-text">Terms</Link>
            <Link href="/privacy" className="hover:text-text">Privacy</Link>
            <Link href="/security" className="hover:text-text">Security</Link>
            <Link href="/cookies" className="hover:text-text">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
