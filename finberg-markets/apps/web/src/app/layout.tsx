import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'FINBERG MARKETS', template: '%s — FINBERG MARKETS' },
  description: 'Institutional-grade trading & market analysis platform.',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'FINBERG MARKETS',
    description: 'Institutional-grade trading & market analysis platform.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en" className="dark h-full">
      <body className="h-full">{children}</body>
    </html>
  );
}
