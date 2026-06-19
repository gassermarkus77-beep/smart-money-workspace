// ============================================================================
// Entry finder
//
// Given LTF state + HTF bias direction, returns the highest-quality entry
// zone available. Preference order:
//   1. Breaker block (highest quality — failed level becomes inverted S/R)
//   2. Bullish/bearish OB inside HTF discount/premium AND aligned with a
//      recent MSS / CHOCH
//   3. FVG inside HTF discount/premium
//   4. Pure PD-zone midline / OTE (62 % / 70.5 % / 79 %)
//
// Returns a zone (low, high) plus the supporting events for narrative use.
// ============================================================================

import type { TimeframeState, SmcEvent, Side } from '../types.js';

export interface EntryCandidate {
  zoneLow: number;
  zoneHigh: number;
  rationale: string;
  triggerEvent: SmcEvent;
  confluence: SmcEvent[];
}

export function findEntry(
  ltfState: TimeframeState,
  htfPdZone: Extract<SmcEvent, { kind: 'PD_ZONE' }> | undefined,
  side: Side,
  currentPrice: number,
): EntryCandidate | null {
  const direction = side === 'long' ? 'bull' : 'bear';

  // Only consider entries in the HTF discount (longs) / premium (shorts).
  const inHtfWindow = (top: number, bottom: number): boolean => {
    if (!htfPdZone) return true;
    if (side === 'long')  return top    <= htfPdZone.midline;          // discount
    return bottom >= htfPdZone.midline;                                 // premium
  };

  // Latest MSS / CHOCH in our direction as a "trigger".
  const trigger = [...ltfState.events]
    .reverse()
    .find(e => (e.kind === 'MSS' || e.kind === 'CHOCH') && e.direction === direction);
  if (!trigger) return null;

  // ----- 1. Breaker blocks -------------------------------------------------
  const breaker = ltfState.activeBreakers
    .filter(b => b.direction === direction && inHtfWindow(b.priceTop, b.priceBottom))
    .filter(b => (side === 'long' ? b.priceTop < currentPrice : b.priceBottom > currentPrice))
    .sort((a, b) => Math.abs(currentPrice - mid(a)) - Math.abs(currentPrice - mid(b)))[0];
  if (breaker) {
    return {
      zoneLow: breaker.priceBottom,
      zoneHigh: breaker.priceTop,
      rationale: `${side} entry from ${direction} breaker block on ${ltfState.timeframe} (failed OB now flipped)`,
      triggerEvent: trigger,
      confluence: [breaker, ...recentSweeps(ltfState, direction)],
    };
  }

  // ----- 2. Order Block aligned with trigger ------------------------------
  const ob = ltfState.activeOBs
    .filter(o => o.direction === direction && inHtfWindow(o.priceTop, o.priceBottom))
    .filter(o => (side === 'long' ? o.priceTop < currentPrice : o.priceBottom > currentPrice))
    .sort((a, b) => Math.abs(currentPrice - mid(a)) - Math.abs(currentPrice - mid(b)))[0];
  if (ob) {
    return {
      zoneLow: ob.priceBottom,
      zoneHigh: ob.priceTop,
      rationale: `${side} entry from ${direction} order block on ${ltfState.timeframe} after ${trigger.kind}`,
      triggerEvent: trigger,
      confluence: [ob, ...recentSweeps(ltfState, direction)],
    };
  }

  // ----- 3. FVG inside HTF window -----------------------------------------
  const fvg = ltfState.activeFVGs
    .filter(f => f.direction === direction && inHtfWindow(f.priceTop, f.priceBottom))
    .filter(f => (side === 'long' ? f.priceTop < currentPrice : f.priceBottom > currentPrice))
    .sort((a, b) => Math.abs(currentPrice - mid(a)) - Math.abs(currentPrice - mid(b)))[0];
  if (fvg) {
    return {
      zoneLow: fvg.priceBottom,
      zoneHigh: fvg.priceTop,
      rationale: `${side} entry from ${direction} FVG on ${ltfState.timeframe} (HTF ${side === 'long' ? 'discount' : 'premium'})`,
      triggerEvent: trigger,
      confluence: [fvg, ...recentSweeps(ltfState, direction)],
    };
  }

  // ----- 4. OTE on HTF PD zone --------------------------------------------
  if (htfPdZone) {
    const ote62  = htfPdZone.ote62;
    const ote705 = htfPdZone.ote705;
    const ote79  = htfPdZone.ote79;
    const zoneLow  = side === 'long' ? Math.min(ote62, ote79) : Math.max(ote62, ote79);
    const zoneHigh = side === 'long' ? Math.max(ote62, ote79) : Math.min(ote62, ote79);
    void ote705;
    return {
      zoneLow: Math.min(zoneLow, zoneHigh),
      zoneHigh: Math.max(zoneLow, zoneHigh),
      rationale: `${side} entry from HTF Optimal Trade Entry zone (62–79% retracement)`,
      triggerEvent: trigger,
      confluence: recentSweeps(ltfState, direction),
    };
  }

  return null;
}

function mid(z: { priceTop: number; priceBottom: number }): number {
  return (z.priceTop + z.priceBottom) / 2;
}

function recentSweeps(state: TimeframeState, direction: 'bull' | 'bear'): SmcEvent[] {
  return state.events
    .filter(e => e.kind === 'LIQ_SWEEP' && e.direction === direction)
    .slice(-3);
}
