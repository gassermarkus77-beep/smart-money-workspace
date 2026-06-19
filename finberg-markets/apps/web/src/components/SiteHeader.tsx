'use client';

// ============================================================================
// SiteHeader — TradingView-style top navigation that ships on every public
// page (landing, markets, news, ideas, pricing). Sticky, with mega-menu
// dropdowns on hover.
// ============================================================================

import Link from 'next/link';
import { useState } from 'react';
import {
  Search, Bell, MessageCircle, ChevronDown, Menu, Globe, User,
} from 'lucide-react';

const NAV = [
  {
    label: 'Products',
    items: [
      { label: 'Supercharts',  href: '/chart',  desc: 'Multi-asset realtime charting' },
      { label: 'SMC AI',       href: '/smc',    desc: 'Smart Money Concepts engine' },
      { label: 'Scanner',      href: '/scanner', desc: 'Find setups across markets' },
      { label: 'Alerts',       href: '/alerts', desc: 'Price + indicator + news alerts' },
    ],
  },
  {
    label: 'Community',
    items: [
      { label: 'Ideas',        href: '/ideas',  desc: 'Trading ideas from the network' },
      { label: 'Streams',      href: '/streams', desc: 'Live trading streams' },
      { label: 'Public chats', href: '/chats',  desc: 'Discuss markets in real time' },
    ],
  },
  {
    label: 'Markets',
    items: [
      { label: 'Cryptocurrencies', href: '/markets/crypto',     desc: 'Top crypto by mcap' },
      { label: 'Stocks',           href: '/markets/stocks',     desc: 'US, EU, APAC equities' },
      { label: 'Forex',            href: '/markets/forex',      desc: 'Major / minor / exotic pairs' },
      { label: 'Indices',          href: '/markets/indices',    desc: 'Global benchmarks' },
      { label: 'Commodities',      href: '/markets/commodities', desc: 'Energy, metals, agri' },
      { label: 'Bonds',            href: '/markets/bonds',      desc: 'Sovereign yield curves' },
    ],
  },
  { label: 'News',     href: '/news' },
  { label: 'Brokers',  href: '/brokers' },
  { label: 'Pricing',  href: '/pricing' },
];

export function SiteHeader(): JSX.Element {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [search, setSearch] = useState('');

  return (
    <header className="sticky top-0 z-50 h-14 px-4 bg-bg/95 backdrop-blur border-b border-bg-elevated">
      <div className="max-w-[1600px] mx-auto h-full flex items-center gap-6">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded bg-accent flex items-center justify-center font-bold text-white text-sm">F</div>
          <span className="font-semibold tracking-tight hidden sm:inline">FINBERG</span>
        </Link>

        {/* Nav */}
        <nav className="hidden lg:flex items-center gap-1 text-sm">
          {NAV.map((item, i) => 'items' in item ? (
            <div
              key={item.label}
              className="relative"
              onMouseEnter={() => setOpenIdx(i)}
              onMouseLeave={() => setOpenIdx(null)}
            >
              <button className="px-3 h-9 flex items-center gap-1 rounded text-text-muted hover:text-text hover:bg-bg-elevated">
                {item.label}
                <ChevronDown size={14} />
              </button>
              {openIdx === i && (
                <div className="absolute top-full left-0 pt-1">
                  <div className="w-72 bg-bg-elevated border border-bg-subtle rounded-lg shadow-xl py-2">
                    {item.items.map(it => (
                      <Link
                        key={it.href}
                        href={it.href}
                        className="block px-4 py-2.5 hover:bg-bg-subtle"
                      >
                        <div className="text-sm font-medium text-text">{it.label}</div>
                        <div className="text-xs text-text-muted mt-0.5">{it.desc}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              key={item.label}
              href={item.href}
              className="px-3 h-9 inline-flex items-center rounded text-text-muted hover:text-text hover:bg-bg-elevated"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Search */}
        <div className="relative flex-1 max-w-xs hidden md:block">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-subtle pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symbol, idea, or user…"
            className="w-full h-9 pl-9 pr-3 rounded-md bg-bg-subtle text-sm border border-bg-elevated focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ml-auto">
          <IconBtn title="Language"><Globe size={16} /></IconBtn>
          <IconBtn title="Messages"><MessageCircle size={16} /></IconBtn>
          <IconBtn title="Notifications"><Bell size={16} /></IconBtn>
          <Link href="/login" className="hidden sm:inline-flex items-center h-9 px-3 text-sm text-text-muted hover:text-text">
            Sign in
          </Link>
          <Link
            href="/signup"
            className="inline-flex items-center h-9 px-4 rounded-md bg-accent hover:bg-accent-hover text-white text-sm font-semibold"
          >
            Get started
          </Link>
          <button className="lg:hidden p-2 text-text-muted">
            <Menu size={18} />
          </button>
        </div>
      </div>
    </header>
  );
}

function IconBtn({ children, title }: { children: React.ReactNode; title: string }): JSX.Element {
  return (
    <button
      title={title}
      className="w-9 h-9 inline-flex items-center justify-center rounded-md text-text-muted hover:bg-bg-elevated hover:text-text"
    >
      {children}
    </button>
  );
}
