// ============================================================================
// Internal / External Liquidity classifier
//
// Convention used:
//   - EXTERNAL liquidity sits at the extremes of the dealing range: the swing
//     high and swing low that define it. Stops parked at these extremes are
//     "external" — sweeping them shifts the macro picture.
//   - INTERNAL liquidity sits at minor swings *inside* the range. Stops here
//     are easier to take and are commonly raided before the major move toward
//     the external pool.
//
// The classifier just relabels the swing series given a range, producing
// LIQ_INT / LIQ_EXT events that the scenario builder can target.
// ============================================================================

import { randomUUID } from 'node:crypto';
import type { Timeframe } from '@finberg/shared/market';
import type { SmcEvent, Swing } from '../types.js';

export interface LiquidityInput {
  symbol: string;
  timeframe: Timeframe;
  rangeHigh: number;
  rangeLow:  number;
  highs: Swing[];
  lows:  Swing[];
}

export function classifyLiquidity(input: LiquidityInput): Array<Extract<SmcEvent, { kind: 'LIQ_INT' | 'LIQ_EXT' }>> {
  const { symbol, timeframe, rangeHigh, rangeLow, highs, lows } = input;
  const out: Array<Extract<SmcEvent, { kind: 'LIQ_INT' | 'LIQ_EXT' }>> = [];
  const tol = (rangeHigh - rangeLow) * 0.005;     // 0.5% of range for "equals range extreme"

  for (const h of highs) {
    const isExternal = Math.abs(h.price - rangeHigh) <= tol;
    out.push(buildLiq(isExternal ? 'LIQ_EXT' : 'LIQ_INT', 'high', h.price, h.time, symbol, timeframe));
  }
  for (const l of lows) {
    const isExternal = Math.abs(l.price - rangeLow) <= tol;
    out.push(buildLiq(isExternal ? 'LIQ_EXT' : 'LIQ_INT', 'low', l.price, l.time, symbol, timeframe));
  }
  return out;
}

function buildLiq(
  kind: 'LIQ_INT' | 'LIQ_EXT',
  side: 'high' | 'low',
  price: number,
  at: number,
  symbol: string,
  timeframe: Timeframe,
): Extract<SmcEvent, { kind: 'LIQ_INT' | 'LIQ_EXT' }> {
  return {
    id: randomUUID(), kind, side, price,
    symbol, timeframe,
    startedAt: at, active: true,
  };
}
