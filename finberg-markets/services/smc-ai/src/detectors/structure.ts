// ============================================================================
// Market structure detector
//
// Detects swing highs / swing lows using a configurable left/right strength
// (a.k.a. fractal lookback). From the swing series we derive:
//   - HH / HL / LH / LL classification
//   - current trend state (bullish / bearish / neutral)
//   - lastSwingHigh / lastSwingLow trackers
//   - internal swings (used by liquidity classifier)
//
// The implementation is deterministic and side-effect free so the same bar
// stream always produces the same swings. Each swing is *confirmed* exactly
// `right` bars after it forms; the engine never relies on lookahead.
// ============================================================================

import type { Bar } from '@finberg/shared/market';
import type { MarketStructureState, Swing } from '../types.js';

export interface StructureOptions {
  /** Bars to the left + right that must be lower (higher) than the swing. Default 3. */
  swingStrength?: number;
  /** Bars considered "internal" — finer swings inside the dominant ones. */
  internalSwingStrength?: number;
}

export function detectStructure(bars: Bar[], opts: StructureOptions = {}): MarketStructureState & { allHighs: Swing[]; allLows: Swing[] } {
  const r = opts.swingStrength ?? 3;
  const rInternal = opts.internalSwingStrength ?? 1;

  const allHighs: Swing[] = [];
  const allLows:  Swing[] = [];
  const internalHighs: Swing[] = [];
  const internalLows:  Swing[] = [];

  for (let i = r; i < bars.length - r; i++) {
    if (isSwingHigh(bars, i, r)) {
      allHighs.push({ time: bars[i]!.t, price: bars[i]!.h, kind: 'HH', barIndex: i });
    }
    if (isSwingLow(bars, i, r)) {
      allLows.push({ time: bars[i]!.t, price: bars[i]!.l, kind: 'LL', barIndex: i });
    }
  }
  for (let i = rInternal; i < bars.length - rInternal; i++) {
    if (isSwingHigh(bars, i, rInternal)) {
      internalHighs.push({ time: bars[i]!.t, price: bars[i]!.h, kind: 'HH', barIndex: i });
    }
    if (isSwingLow(bars, i, rInternal)) {
      internalLows.push({ time: bars[i]!.t, price: bars[i]!.l, kind: 'LL', barIndex: i });
    }
  }

  classify(allHighs, 'high');
  classify(allLows,  'low');

  const lastSwingHigh = allHighs[allHighs.length - 1];
  const lastSwingLow  = allLows[allLows.length - 1];
  const trend = inferTrend(allHighs, allLows);

  return {
    trend,
    ...(lastSwingHigh ? { lastSwingHigh } : {}),
    ...(lastSwingLow  ? { lastSwingLow }  : {}),
    internalSwingsHigh: internalHighs,
    internalSwingsLow:  internalLows,
    allHighs,
    allLows,
  };
}

function isSwingHigh(bars: Bar[], i: number, r: number): boolean {
  const h = bars[i]!.h;
  for (let k = i - r; k <= i + r; k++) if (k !== i && bars[k]!.h >= h) return false;
  return true;
}
function isSwingLow(bars: Bar[], i: number, r: number): boolean {
  const l = bars[i]!.l;
  for (let k = i - r; k <= i + r; k++) if (k !== i && bars[k]!.l <= l) return false;
  return true;
}

function classify(swings: Swing[], kind: 'high' | 'low'): void {
  for (let i = 1; i < swings.length; i++) {
    const prev = swings[i - 1]!, cur = swings[i]!;
    if (kind === 'high') {
      cur.kind = cur.price > prev.price ? 'HH' : 'LH';
    } else {
      cur.kind = cur.price < prev.price ? 'LL' : 'HL';
    }
  }
}

function inferTrend(highs: Swing[], lows: Swing[]): 'bullish' | 'bearish' | 'neutral' {
  // Last two highs + last two lows vote.
  const h2 = highs.slice(-2), l2 = lows.slice(-2);
  if (h2.length < 2 || l2.length < 2) return 'neutral';
  const hh = h2[1]!.price > h2[0]!.price;
  const hl = l2[1]!.price > l2[0]!.price;
  const lh = h2[1]!.price < h2[0]!.price;
  const ll = l2[1]!.price < l2[0]!.price;
  if (hh && hl) return 'bullish';
  if (lh && ll) return 'bearish';
  return 'neutral';
}
