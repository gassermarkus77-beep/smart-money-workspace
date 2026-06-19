'use client';

import { useEffect, useState } from 'react';
import type { Bar } from '@finberg/shared/market';
import { fetchBinanceBars } from '../lib/binance';

/** Tiny SVG sparkline of the last 24h hourly closes for a symbol. */
export function Sparkline({ symbol, width = 100, height = 32 }: { symbol: string; width?: number; height?: number }): JSX.Element {
  const [bars, setBars] = useState<Bar[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetchBinanceBars(symbol, '1h', 24)
      .then(b => { if (!cancelled) setBars(b); })
      .catch(() => { /* graceful empty */ });
    return () => { cancelled = true; };
  }, [symbol]);

  if (bars.length < 2) {
    return <svg width={width} height={height} />;
  }

  const min = Math.min(...bars.map(b => b.l));
  const max = Math.max(...bars.map(b => b.h));
  const range = Math.max(0.0001, max - min);
  const stepX = width / (bars.length - 1);
  const points = bars.map((b, i) => `${(i * stepX).toFixed(2)},${((max - b.c) / range * height).toFixed(2)}`).join(' ');
  const up = bars[bars.length - 1]!.c >= bars[0]!.c;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      <polyline
        points={points}
        fill="none"
        stroke={up ? '#26a69a' : '#ef5350'}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
