// ============================================================================
// Breaker Block detector
//
// An OB becomes a "breaker" when price closes through its opposite side AND
// then returns to retest the zone from the opposite direction. A bullish OB
// that is invalidated and retested from above becomes a bearish breaker, and
// vice versa. Breakers are high-quality continuation setups.
//
// Inputs:
//   - all OBs produced by the order-block detector
//   - the bar series (to find invalidation + retest)
//
// Output: BB events with priceTop/priceBottom equal to the original OB zone
// but with the *inverted* direction.
// ============================================================================

import { randomUUID } from 'node:crypto';
import type { Bar, Timeframe } from '@finberg/shared/market';
import type { SmcEvent } from '../types.js';

export function detectBreakerBlocks(
  obs: Array<Extract<SmcEvent, { kind: 'OB' }>>,
  bars: Bar[],
  symbol: string,
  timeframe: Timeframe,
): Array<Extract<SmcEvent, { kind: 'BB' }>> {
  const out: Array<Extract<SmcEvent, { kind: 'BB' }>> = [];
  const obByTime = obs.slice().sort((a, b) => a.startedAt - b.startedAt);

  for (const ob of obByTime) {
    if (!ob.mitigatedAt) continue;
    const breakIdx = bars.findIndex(b => b.t === ob.mitigatedAt);
    if (breakIdx < 0 || breakIdx >= bars.length - 1) continue;

    // After invalidation, look for a retest from the opposite direction
    for (let j = breakIdx + 1; j < bars.length; j++) {
      const b = bars[j]!;
      if (ob.direction === 'bull') {
        // Original was bullish, invalidated downward → breaker is now bearish resistance
        if (b.h >= ob.priceBottom && b.h <= ob.priceTop) {
          out.push({
            id: randomUUID(),
            kind: 'BB',
            direction: 'bear',
            priceTop: ob.priceTop,
            priceBottom: ob.priceBottom,
            symbol, timeframe,
            startedAt: b.t,
            active: true,
            payload: { originalObId: ob.id, retestedAtClose: b.c },
          });
          break;
        }
      } else {
        if (b.l <= ob.priceTop && b.l >= ob.priceBottom) {
          out.push({
            id: randomUUID(),
            kind: 'BB',
            direction: 'bull',
            priceTop: ob.priceTop,
            priceBottom: ob.priceBottom,
            symbol, timeframe,
            startedAt: b.t,
            active: true,
            payload: { originalObId: ob.id, retestedAtClose: b.c },
          });
          break;
        }
      }
    }
  }
  return out;
}
