// ============================================================================
// Equal Highs / Equal Lows clustering
//
// Two swings are considered "equal" when their prices are within a tolerance
// of (toleranceAtr × current ATR). Clusters of 2+ equal swings form an EQH/EQL
// liquidity pool — these are the obvious targets institutions raid.
//
// The emitted event represents the cluster: its `price` is the median of the
// cluster and `payload.swingTimes` lists the contributing swing timestamps so
// the UI can draw a line + dot markers.
// ============================================================================

import { randomUUID } from 'node:crypto';
import type { Bar, Timeframe } from '@finberg/shared/market';
import type { SmcEvent, Swing } from '../types.js';

export interface EqualSwingOptions {
  toleranceAtr?: number;             // default 0.15 ATR
  minClusterSize?: number;           // default 2
}

export function detectEqualHighsLows(
  bars: Bar[],
  highs: Swing[],
  lows: Swing[],
  symbol: string,
  timeframe: Timeframe,
  opts: EqualSwingOptions = {},
): Array<Extract<SmcEvent, { kind: 'EQH' | 'EQL' }>> {
  const tol = opts.toleranceAtr ?? 0.15;
  const minCluster = opts.minClusterSize ?? 2;
  const atr = rollingAtr(bars, 14);

  return [
    ...cluster(highs, 'EQH', bars, atr, tol, minCluster, symbol, timeframe),
    ...cluster(lows,  'EQL', bars, atr, tol, minCluster, symbol, timeframe),
  ];
}

function cluster(
  swings: Swing[],
  kind: 'EQH' | 'EQL',
  bars: Bar[],
  atr: number[],
  tol: number,
  minSize: number,
  symbol: string,
  timeframe: Timeframe,
): Array<Extract<SmcEvent, { kind: 'EQH' | 'EQL' }>> {
  const out: Array<Extract<SmcEvent, { kind: 'EQH' | 'EQL' }>> = [];
  if (swings.length < minSize) return out;

  // Greedy clustering: for each swing, look forward up to N swings and group those within tolerance.
  const used = new Set<number>();
  for (let i = 0; i < swings.length; i++) {
    if (used.has(i)) continue;
    const cluster: Swing[] = [swings[i]!];
    const atrI = atr[swings[i]!.barIndex] ?? 0;
    if (atrI === 0) continue;
    const tolerance = tol * atrI;

    for (let j = i + 1; j < swings.length; j++) {
      if (used.has(j)) continue;
      if (Math.abs(swings[j]!.price - swings[i]!.price) <= tolerance) {
        cluster.push(swings[j]!);
        used.add(j);
      }
    }

    if (cluster.length >= minSize) {
      used.add(i);
      const sorted = cluster.map(s => s.price).sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)]!;
      out.push({
        id: randomUUID(), kind,
        price: median,
        symbol, timeframe,
        startedAt: cluster[0]!.time,
        endedAt: cluster[cluster.length - 1]!.time,
        active: true,
        payload: {
          swingTimes: cluster.map(s => s.time),
          memberPrices: cluster.map(s => s.price),
          count: cluster.length,
        },
      });
    }
  }
  return out;
}

function rollingAtr(bars: Bar[], length: number): number[] {
  const out = new Array<number>(bars.length).fill(0);
  let prev: Bar | undefined, sum = 0;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]!;
    const tr = prev ? Math.max(b.h - b.l, Math.abs(b.h - prev.c), Math.abs(b.l - prev.c)) : b.h - b.l;
    if (i < length) { sum += tr; out[i] = sum / (i + 1); }
    else { out[i] = (out[i - 1]! * (length - 1) + tr) / length; }
    prev = b;
  }
  return out;
}
