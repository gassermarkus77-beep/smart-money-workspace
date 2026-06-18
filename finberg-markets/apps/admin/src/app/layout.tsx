import type { ReactNode } from 'react';

export default function RootLayout({ children }: { children: ReactNode }): JSX.Element {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100">{children}</body>
    </html>
  );
}

export const metadata = { title: 'FINBERG Admin' };
