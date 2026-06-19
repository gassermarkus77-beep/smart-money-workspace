// ============================================================================
// Liquidity Sweep detector
//
// A sweep occurs when price wicks BEYOND a recognized liquidity pool
// (swing high / swing low / EQH cluster / EQL cluster / PDH / PDL / session
// extreme) and then CLOSES back inside the previous range on the same or next
// bar. This signals stop-runs and is a primary precondition for MSS.
//
// We accept the following pool types:
//   - swingHighs / swingLows (from the structure detector)
//   - explicit price levels (PDH/PDL/ASIA_H/ASIA_L/etc.) via the `extraLevels`
//     parameter so the caller can wire in session anchors.
//
// Each sweep carries:
//   - side: 'high' | 'low'
//   - price: the level that was swept
//   - direction: opposite of `side` ('high' → 'bear', 'low' → 'bull')
//   - payload.depth: how far past the level price extended, in ATRs
//   - payload.barIndex: index of the bar that completed the sweep
// ============================================================================

import { randomUUID } from 'node:crypto';
import type { Bar, Timeframe } from '@finberg/shared/market';
import type { SmcEvent, Swing } from '../types.js';

export interface SweepOptions {
  swingHighs?: Swing[];
  swingLows?: Swing[];
  extraLevels?: Array<{ side: 'high' | 'low'; price: number; label?: string }>;
  /** Min depth past the level in ATRs to count as a sweep. Default 0.05. */
  minDepthAtr?: number;
  /** Max depth past the level — beyond this it's a break, not a sweep. Default 1.0. */
  maxDepthAtr?: number;
}

export function detectLiquiditySweeps(
  bars: Bar[],
  symbol: string,
  timeframe: Timeframe,
  opts: SweepOptions = {},
): Array<Extract<SmcEvent, { kind: 'LIQ_SWEEP' }>> {
  const out: Array<Extract<SmcEvent, { kind: 'LIQ_SWEEP' }>> = [];
  const atr = rollingAtr(bars, 14);
  const minDepth = opts.minDepthAtr ?? 0.05;
  const maxDepth = opts.maxDepthAtr ?? 1.0;

  const highs = collectLevels('high', opts.swingHighs, opts.extraLevels);
  const lows  = collectLevels('low',  opts.swingLows,  opts.extraLevels);

  for (let i = 1; i < bars.length; i++) {
    const b = bars[i]!;
    const atrI = atr[i] ?? 0;
    if (atrI === 0) continue;

    // High sweep: wick punches above a high level, close stays below it
    for (const lvl of highs) {
      if (lvl.barIndex !== undefined && lvl.barIndex >= i) continue;
      if (b.h > lvl.price && b.c < lvl.price) {
        const depth = (b.h - lvl.price) / atrI;
        if (depth >= minDepth && depth <= maxDepth) {
          out.push({
            id: randomUUID(), kind: 'LIQ_SWEEP', direction: 'bear', side: 'high',
            price: lvl.price, symbol, timeframe,
            startedAt: b.t, endedAt: b.t, active: false,
            payload: { depthAtr: depth, barIndex: i, label: lvl.label ?? 'swing_high' },
          });
        }
      }
    }
    // Low sweep
    for (const lvl of lows) {
      if (lvl.barIndex !== undefined && lvl.barIndex >= i) continue;
      if (b.l < lvl.price && b.c > lvl.price) {
        const depth = (lvl.price - b.l) / atrI;
        if (depth >= minDepth && depth <= maxDepth) {
          out.push({
            id: randomUUID(), kind: 'LIQ_SWEEP', direction: 'bull', side: 'low',
            price: lvl.price, symbol, timeframe,
            startedAt: b.t, endedAt: b.t, active: false,
            payload: { depthAtr: depth, barIndex: i, label: lvl.label ?? 'swing_low' },
          });
        }
      }
    }
  }
  return out;
}

function collectLevels(
  side: 'high' | 'low',
  swings: Swing[] | undefined,
  extra: SweepOptions['extraLevels'],
): Array<{ price: number; barIndex?: number; label?: string }> {
  const arr: Array<{ price: number; barIndex?: number; label?: string }> = [];
  if (swings) for (const s of swings) arr.push({ price: s.price, barIndex: s.barIndex, label: `swing_${side}` });
  if (extra)  for (const e of extra)  if (e.side === side) arr.push({ price: e.price, ...(e.label ? { label: e.label } : {}) });
  return arr;
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
