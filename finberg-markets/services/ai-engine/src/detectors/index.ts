// ============================================================================
// Smart Money / ICT detector suite (reference, rule-based).
// Production v2 swaps the heuristic OB & sweep detectors with ONNX models.
// All detectors take a chronologically-sorted bars array and return events.
// ============================================================================

export interface SmcBar { t: number; o: number; h: number; l: number; c: number; v: number }

export type SmcEvent =
  | { type: 'FVG'; direction: 'bull' | 'bear'; top: number; bottom: number; createdAt: number; mitigated: boolean }
  | { type: 'OB'; direction: 'bull' | 'bear'; top: number; bottom: number; createdAt: number }
  | { type: 'BOS'; direction: 'bull' | 'bear'; price: number; at: number }
  | { type: 'CHOCH'; direction: 'bull' | 'bear'; price: number; at: number }
  | { type: 'LIQ_SWEEP'; side: 'high' | 'low'; price: number; at: number };

export interface SmcResult {
  fvgs: Array<Extract<SmcEvent, { type: 'FVG' }>>;
  orderBlocks: Array<Extract<SmcEvent, { type: 'OB' }>>;
  bos: Array<Extract<SmcEvent, { type: 'BOS' }>>;
  choch: Array<Extract<SmcEvent, { type: 'CHOCH' }>>;
  liquiditySweeps: Array<Extract<SmcEvent, { type: 'LIQ_SWEEP' }>>;
  marketStructure: 'bullish' | 'bearish' | 'neutral';
}

// ----- FVG (Fair Value Gap) -----------------------------------------------
// A 3-bar formation: bar i and bar i+2 don't overlap → gap exists.
export function detectFVG(bars: SmcBar[]): Array<Extract<SmcEvent, { type: 'FVG' }>> {
  const out: Array<Extract<SmcEvent, { type: 'FVG' }>> = [];
  for (let i = 2; i < bars.length; i++) {
    const a = bars[i - 2]!, b = bars[i - 1]!, c = bars[i]!;
    // Bullish FVG: a.high < c.low (gap up)
    if (a.h < c.l) {
      const top = c.l, bottom = a.h;
      const mitigated = bars.slice(i + 1).some(x => x.l <= top && x.h >= bottom);
      out.push({ type: 'FVG', direction: 'bull', top, bottom, createdAt: b.t, mitigated });
    }
    // Bearish FVG: a.low > c.high (gap down)
    if (a.l > c.h) {
      const top = a.l, bottom = c.h;
      const mitigated = bars.slice(i + 1).some(x => x.l <= top && x.h >= bottom);
      out.push({ type: 'FVG', direction: 'bear', top, bottom, createdAt: b.t, mitigated });
    }
  }
  return out;
}

// ----- Order Blocks (heuristic) -------------------------------------------
// Last opposite-direction candle before a strong impulsive move.
export function detectOrderBlocks(bars: SmcBar[], impulseAtrMultiple = 1.5): Array<Extract<SmcEvent, { type: 'OB' }>> {
  const atr = rollingATR(bars, 14);
  const out: Array<Extract<SmcEvent, { type: 'OB' }>> = [];
  for (let i = 1; i < bars.length - 1; i++) {
    const cur = bars[i]!, next = bars[i + 1]!;
    const range = atr[i] ?? 0;
    const move  = next.c - next.o;
    if (range === 0) continue;
    if (cur.c < cur.o && move > range * impulseAtrMultiple) {
      out.push({ type: 'OB', direction: 'bull', top: cur.h, bottom: cur.l, createdAt: cur.t });
    } else if (cur.c > cur.o && -move > range * impulseAtrMultiple) {
      out.push({ type: 'OB', direction: 'bear', top: cur.h, bottom: cur.l, createdAt: cur.t });
    }
  }
  return out;
}

// ----- Swing / BOS / CHOCH FSM --------------------------------------------
export function detectStructure(bars: SmcBar[], swingLookback = 5): {
  bos: Array<Extract<SmcEvent, { type: 'BOS' }>>;
  choch: Array<Extract<SmcEvent, { type: 'CHOCH' }>>;
  state: 'bullish' | 'bearish' | 'neutral';
} {
  const bos: Array<Extract<SmcEvent, { type: 'BOS' }>> = [];
  const choch: Array<Extract<SmcEvent, { type: 'CHOCH' }>> = [];
  let trend: 'bull' | 'bear' | null = null;
  let lastSwingHigh: { p: number; t: number } | null = null;
  let lastSwingLow:  { p: number; t: number } | null = null;

  for (let i = swingLookback; i < bars.length - swingLookback; i++) {
    const b = bars[i]!;
    const isHigh = bars.slice(i - swingLookback, i + swingLookback + 1).every(x => x.h <= b.h);
    const isLow  = bars.slice(i - swingLookback, i + swingLookback + 1).every(x => x.l >= b.l);
    if (isHigh) {
      if (trend === 'bull' && lastSwingHigh && b.h > lastSwingHigh.p) {
        bos.push({ type: 'BOS', direction: 'bull', price: b.h, at: b.t });
      } else if (trend === 'bear' && lastSwingHigh && b.h > lastSwingHigh.p) {
        choch.push({ type: 'CHOCH', direction: 'bull', price: b.h, at: b.t });
        trend = 'bull';
      } else if (trend === null) {
        trend = 'bull';
      }
      lastSwingHigh = { p: b.h, t: b.t };
    }
    if (isLow) {
      if (trend === 'bear' && lastSwingLow && b.l < lastSwingLow.p) {
        bos.push({ type: 'BOS', direction: 'bear', price: b.l, at: b.t });
      } else if (trend === 'bull' && lastSwingLow && b.l < lastSwingLow.p) {
        choch.push({ type: 'CHOCH', direction: 'bear', price: b.l, at: b.t });
        trend = 'bear';
      } else if (trend === null) {
        trend = 'bear';
      }
      lastSwingLow = { p: b.l, t: b.t };
    }
  }
  return { bos, choch, state: trend === 'bull' ? 'bullish' : trend === 'bear' ? 'bearish' : 'neutral' };
}

// ----- Liquidity sweeps (wick-rejection of recent swing high/low) ---------
export function detectLiquiditySweeps(bars: SmcBar[], lookback = 20): Array<Extract<SmcEvent, { type: 'LIQ_SWEEP' }>> {
  const out: Array<Extract<SmcEvent, { type: 'LIQ_SWEEP' }>> = [];
  for (let i = lookback; i < bars.length; i++) {
    const window = bars.slice(i - lookback, i);
    const swingHigh = Math.max(...window.map(b => b.h));
    const swingLow  = Math.min(...window.map(b => b.l));
    const b = bars[i]!;
    if (b.h > swingHigh && b.c < swingHigh) out.push({ type: 'LIQ_SWEEP', side: 'high', price: b.h, at: b.t });
    if (b.l < swingLow  && b.c > swingLow ) out.push({ type: 'LIQ_SWEEP', side: 'low',  price: b.l, at: b.t });
  }
  return out;
}

// ----- Aggregator ---------------------------------------------------------
export function detectAll(bars: SmcBar[]): SmcResult {
  const fvgs = detectFVG(bars);
  const orderBlocks = detectOrderBlocks(bars);
  const structure = detectStructure(bars);
  const liquiditySweeps = detectLiquiditySweeps(bars);
  return {
    fvgs,
    orderBlocks,
    bos: structure.bos,
    choch: structure.choch,
    liquiditySweeps,
    marketStructure: structure.state,
  };
}

// ----- Helpers ------------------------------------------------------------
function rollingATR(bars: SmcBar[], length = 14): number[] {
  const out = new Array<number>(bars.length).fill(0);
  let sum = 0;
  for (let i = 1; i < bars.length; i++) {
    const prev = bars[i - 1]!, b = bars[i]!;
    const tr = Math.max(b.h - b.l, Math.abs(b.h - prev.c), Math.abs(b.l - prev.c));
    if (i <= length) { sum += tr; out[i] = sum / i; }
    else { out[i] = (out[i - 1]! * (length - 1) + tr) / length; }
  }
  return out;
}
