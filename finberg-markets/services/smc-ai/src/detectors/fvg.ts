// ============================================================================
// Fair Value Gap (FVG) detector
//
// A 3-bar formation: bars (i-2) and (i) do not overlap.
//   - Bullish FVG: bar[i-2].h < bar[i].l → gap zone [bar[i-2].h, bar[i].l]
//   - Bearish FVG: bar[i-2].l > bar[i].h → gap zone [bar[i].h,  bar[i-2].l]
//
// Each FVG carries:
//   - createdAt (timestamp of bar[i-1])
//   - mitigation: fraction of the gap that has been re-traded since
//   - mitigated:  true when mitigation >= 1
// Mitigation is recomputed on every new bar; once fully mitigated the gap is
// archived (active=false) so the chart stops drawing it as live.
// ============================================================================

import { randomUUID } from 'node:crypto';
import type { Bar, Timeframe } from '@finberg/shared/market';
import type { SmcEvent } from '../types.js';

export interface FvgOptions {
  /** Discard gaps smaller than (atrFraction × ATR14). 0 disables. */
  minAtrFraction?: number;
}

export function detectFVG(
  bars: Bar[],
  symbol: string,
  timeframe: Timeframe,
  opts: FvgOptions = {},
): Array<Extract<SmcEvent, { kind: 'FVG' }>> {
  const out: Array<Extract<SmcEvent, { kind: 'FVG' }>> = [];
  const atr = rollingAtr(bars, 14);
  const minFrac = opts.minAtrFraction ?? 0.25;

  for (let i = 2; i < bars.length; i++) {
    const a = bars[i - 2]!, mid = bars[i - 1]!, c = bars[i]!;

    // Bullish gap up
    if (a.h < c.l) {
      const top = c.l, bottom = a.h;
      if ((top - bottom) >= minFrac * (atr[i] ?? 0)) {
        out.push(buildFvg('bull', top, bottom, mid.t, bars, i, symbol, timeframe));
      }
    }
    // Bearish gap down
    if (a.l > c.h) {
      const top = a.l, bottom = c.h;
      if ((top - bottom) >= minFrac * (atr[i] ?? 0)) {
        out.push(buildFvg('bear', top, bottom, mid.t, bars, i, symbol, timeframe));
      }
    }
  }

  return out;
}

function buildFvg(
  direction: 'bull' | 'bear',
  top: number,
  bottom: number,
  createdAt: number,
  bars: Bar[],
  fromIdx: number,
  symbol: string,
  timeframe: Timeframe,
): Extract<SmcEvent, { kind: 'FVG' }> {
  // Mitigation: how much of the gap has been traded back into.
  let mitigated = 0;
  let mitigatedAt: number | undefined;
  const size = top - bottom;
  for (let j = fromIdx + 1; j < bars.length; j++) {
    const b = bars[j]!;
    const overlapTop    = Math.min(top, b.h);
    const overlapBottom = Math.max(bottom, b.l);
    if (overlapTop > overlapBottom) {
      const portion = (overlapTop - overlapBottom) / size;
      mitigated = Math.max(mitigated, portion);
      if (mitigated >= 1 && mitigatedAt === undefined) mitigatedAt = b.t;
    }
  }
  return {
    id: randomUUID(),
    kind: 'FVG',
    direction,
    priceTop: top,
    priceBottom: bottom,
    symbol,
    timeframe,
    startedAt: createdAt,
    active: mitigated < 1,
    mitigated: mitigated >= 1,
    ...(mitigatedAt !== undefined ? { mitigatedAt } : {}),
    payload: { mitigationPct: Math.min(1, mitigated) },
  };
}

function rollingAtr(bars: Bar[], length: number): number[] {
  const out = new Array<number>(bars.length).fill(0);
  let prev: Bar | undefined;
  let sum = 0;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]!;
    const tr = prev ? Math.max(b.h - b.l, Math.abs(b.h - prev.c), Math.abs(b.l - prev.c)) : b.h - b.l;
    if (i < length) { sum += tr; out[i] = sum / (i + 1); }
    else { out[i] = (out[i - 1]! * (length - 1) + tr) / length; }
    prev = b;
  }
  return out;
}
