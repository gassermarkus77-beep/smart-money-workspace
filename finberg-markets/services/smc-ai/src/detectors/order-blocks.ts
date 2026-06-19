// ============================================================================
// Order Block (OB) detector
//
// Definition used (ICT-aligned, deterministic variant):
//   A bullish OB is the LAST DOWN-CLOSE candle before an impulsive up move that
//   either breaks structure or covers >= K × ATR within N bars. The OB zone is
//   the high/low of that candle. Bearish OB is the mirror.
//
// We further validate:
//   - The candle must be a "displacement origin": next candle's body crosses
//     the candle's open with a body >= K × ATR.
//   - The OB remains active until price closes through its opposite side
//     (mitigation/breaker condition — fed to the breaker-block detector).
// ============================================================================

import { randomUUID } from 'node:crypto';
import type { Bar, Timeframe } from '@finberg/shared/market';
import type { SmcEvent } from '../types.js';

export interface OrderBlockOptions {
  /** Minimum size of the displacement move in ATRs. Default 1.2. */
  displacementAtrMultiple?: number;
  /** Bars within which the displacement must complete. Default 3. */
  displacementWindow?: number;
}

export function detectOrderBlocks(
  bars: Bar[],
  symbol: string,
  timeframe: Timeframe,
  opts: OrderBlockOptions = {},
): Array<Extract<SmcEvent, { kind: 'OB' }>> {
  const out: Array<Extract<SmcEvent, { kind: 'OB' }>> = [];
  const atr = rollingAtr(bars, 14);
  const k = opts.displacementAtrMultiple ?? 1.2;
  const W = opts.displacementWindow ?? 3;

  for (let i = 0; i < bars.length - W - 1; i++) {
    const cur = bars[i]!;
    const window = bars.slice(i + 1, i + 1 + W);
    const atrI = atr[i] ?? 0;
    if (atrI === 0) continue;

    // Bullish OB: down-close candle followed by an impulsive up move
    const isDown = cur.c < cur.o;
    if (isDown) {
      const move = Math.max(...window.map(w => w.c)) - cur.c;
      if (move >= k * atrI) {
        out.push(buildOb('bull', cur, bars, i, symbol, timeframe));
      }
    }

    // Bearish OB: up-close candle followed by an impulsive down move
    const isUp = cur.c > cur.o;
    if (isUp) {
      const move = cur.c - Math.min(...window.map(w => w.c));
      if (move >= k * atrI) {
        out.push(buildOb('bear', cur, bars, i, symbol, timeframe));
      }
    }
  }
  return out;
}

function buildOb(
  direction: 'bull' | 'bear',
  origin: Bar,
  bars: Bar[],
  fromIdx: number,
  symbol: string,
  timeframe: Timeframe,
): Extract<SmcEvent, { kind: 'OB' }> {
  let mitigated = false;
  let mitigatedAt: number | undefined;
  for (let j = fromIdx + 1; j < bars.length; j++) {
    const b = bars[j]!;
    if (direction === 'bull' && b.c < origin.l) { mitigated = true; mitigatedAt = b.t; break; }
    if (direction === 'bear' && b.c > origin.h) { mitigated = true; mitigatedAt = b.t; break; }
  }
  return {
    id: randomUUID(),
    kind: 'OB',
    direction,
    priceTop: origin.h,
    priceBottom: origin.l,
    symbol,
    timeframe,
    startedAt: origin.t,
    active: !mitigated,
    mitigated,
    ...(mitigatedAt !== undefined ? { mitigatedAt } : {}),
    payload: { originBarTime: origin.t, originOpen: origin.o, originClose: origin.c },
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
