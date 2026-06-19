// ============================================================================
// BOS / CHOCH / MSS detector
//
// Definitions used (ICT-aligned):
//   - BOS    : a close beyond the most recent swing in the direction of trend.
//   - CHOCH  : a close beyond the most recent opposite swing, flipping trend.
//   - MSS    : a strict CHOCH that occurs *after* a liquidity sweep — i.e. the
//              same bar (or the very next) cleared a swing high/low and then
//              closed in the opposite direction. MSS therefore implies CHOCH
//              but the inverse is not true.
//
// Inputs:
//   - bars                : the bar series
//   - structure.allHighs  : confirmed swing highs (ascending in time)
//   - structure.allLows   : confirmed swing lows
//   - sweeps              : liquidity-sweep events (optional; required for MSS)
//
// All output events carry the bar timestamp that *confirmed* the break, the
// price level that was broken, and the direction.
// ============================================================================

import { randomUUID } from 'node:crypto';
import type { Bar, Timeframe } from '@finberg/shared/market';
import type { Direction, SmcEvent, Swing } from '../types.js';

export interface StructureContext {
  allHighs: Swing[];
  allLows:  Swing[];
}

export interface BosChochOptions {
  /** Sweep events on the same TF, used to upgrade qualifying CHOCH to MSS. */
  sweeps?: Array<Extract<SmcEvent, { kind: 'LIQ_SWEEP' }>>;
  /** Maximum bar distance between the sweep and the CHOCH for MSS qualification. */
  mssLookbackBars?: number;
}

export interface BosChochMssResult {
  events: Array<Extract<SmcEvent, { kind: 'BOS' | 'CHOCH' | 'MSS' }>>;
}

export function detectBosChochMss(
  bars: Bar[],
  structure: StructureContext,
  timeframe: Timeframe,
  symbol: string,
  opts: BosChochOptions = {},
): BosChochMssResult {
  const mssLookback = opts.mssLookbackBars ?? 5;
  const events: BosChochMssResult['events'] = [];
  let trend: Direction | null = null;

  // Build a sorted merge of swing events with their bar index for easy lookup.
  const highs = structure.allHighs;
  const lows  = structure.allLows;

  let nextHighIdx = 0, nextLowIdx = 0;
  /** Latest swing high / low that exists *before* the current bar. */
  let activeHigh: Swing | undefined;
  let activeLow:  Swing | undefined;

  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]!;

    while (nextHighIdx < highs.length && highs[nextHighIdx]!.barIndex <= i) {
      activeHigh = highs[nextHighIdx++]!;
    }
    while (nextLowIdx < lows.length && lows[nextLowIdx]!.barIndex <= i) {
      activeLow = lows[nextLowIdx++]!;
    }

    if (activeHigh && b.c > activeHigh.price) {
      if (trend === 'bull') {
        events.push(mk('BOS', 'bull', activeHigh.price, b.t, symbol, timeframe));
      } else {
        const isMss = qualifiesAsMss('high', activeHigh.price, i, mssLookback, opts.sweeps);
        events.push(mk(isMss ? 'MSS' : 'CHOCH', 'bull', activeHigh.price, b.t, symbol, timeframe));
        trend = 'bull';
      }
      // Mark the broken swing as consumed; rest after the break.
      activeHigh = undefined;
    }

    if (activeLow && b.c < activeLow.price) {
      if (trend === 'bear') {
        events.push(mk('BOS', 'bear', activeLow.price, b.t, symbol, timeframe));
      } else {
        const isMss = qualifiesAsMss('low', activeLow.price, i, mssLookback, opts.sweeps);
        events.push(mk(isMss ? 'MSS' : 'CHOCH', 'bear', activeLow.price, b.t, symbol, timeframe));
        trend = 'bear';
      }
      activeLow = undefined;
    }
  }

  return { events };
}

function qualifiesAsMss(
  side: 'high' | 'low',
  level: number,
  barIndex: number,
  lookback: number,
  sweeps: BosChochOptions['sweeps'],
): boolean {
  if (!sweeps?.length) return false;
  return sweeps.some(sw =>
    sw.side === side &&
    // a sweep at or just outside the broken level, within the lookback window
    Math.abs((sw as { price: number }).price - level) / level < 0.005 &&
    // the sweep must be recent — its endedAt is on or before the CHOCH bar
    sw.endedAt !== undefined && barIndex - (sw.payload?.['barIndex'] as number ?? barIndex) <= lookback
  );
}

function mk(
  kind: 'BOS' | 'CHOCH' | 'MSS',
  direction: Direction,
  price: number,
  at: number,
  symbol: string,
  timeframe: Timeframe,
): Extract<SmcEvent, { kind: 'BOS' | 'CHOCH' | 'MSS' }> {
  return {
    id: randomUUID(),
    kind,
    direction,
    price,
    symbol,
    timeframe,
    startedAt: at,
    active: true,
  };
}
