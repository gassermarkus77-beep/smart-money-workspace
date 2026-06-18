// ============================================================================
// Premium / Discount zones + Optimal Trade Entry (OTE)
//
// Given the dealing range defined by (rangeHigh, rangeLow):
//   - 50.0 % is the equilibrium (midline)
//   - above 50 % is the PREMIUM region (sells here favored)
//   - below 50 % is the DISCOUNT region (buys here favored)
//   - OTE = 62 % / 70.5 % / 79 % retracements (fib OTE zone)
//
// The "range" is taken as the most recent confirmed swing pair (lastSwingHigh,
// lastSwingLow). For longer-horizon analysis the caller can pass an override
// via `overrideRange`.
// ============================================================================

import { randomUUID } from 'node:crypto';
import type { Timeframe } from '@finberg/shared/market';
import type { SmcEvent, Swing } from '../types.js';

export interface PdZoneInput {
  symbol: string;
  timeframe: Timeframe;
  lastSwingHigh?: Swing;
  lastSwingLow?:  Swing;
  overrideRange?: { high: number; low: number; time: number };
}

export function detectPremiumDiscount(input: PdZoneInput): Extract<SmcEvent, { kind: 'PD_ZONE' }> | null {
  let high: number, low: number, atTime: number;
  if (input.overrideRange) {
    high = input.overrideRange.high;
    low  = input.overrideRange.low;
    atTime = input.overrideRange.time;
  } else if (input.lastSwingHigh && input.lastSwingLow) {
    high = input.lastSwingHigh.price;
    low  = input.lastSwingLow.price;
    atTime = Math.max(input.lastSwingHigh.time, input.lastSwingLow.time);
  } else {
    return null;
  }
  if (!Number.isFinite(high) || !Number.isFinite(low) || high <= low) return null;

  const size = high - low;
  const midline = low + size * 0.5;
  const ote62   = high - size * 0.62;
  const ote705  = high - size * 0.705;
  const ote79   = high - size * 0.79;

  return {
    id: randomUUID(),
    kind: 'PD_ZONE',
    priceTop: high,
    priceBottom: low,
    midline,
    ote62, ote705, ote79,
    symbol: input.symbol,
    timeframe: input.timeframe,
    startedAt: atTime,
    active: true,
    payload: { rangeSize: size },
  };
}

/** Convenience: classify a current price against a PD zone. */
export function classifyAgainstPd(
  price: number,
  zone: Extract<SmcEvent, { kind: 'PD_ZONE' }>,
): 'premium' | 'discount' | 'equilibrium' {
  if (price > zone.midline) return 'premium';
  if (price < zone.midline) return 'discount';
  return 'equilibrium';
}
