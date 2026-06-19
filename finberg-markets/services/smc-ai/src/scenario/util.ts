// ============================================================================
// Small numeric helpers shared by scenario / backtest / risk modules.
// Avoids re-implementing ATR everywhere.
// ============================================================================

export interface AtrBar { h: number; l: number; c: number }

export function rollingAtrLast(bars: AtrBar[], length: number): number {
  if (bars.length === 0) return 0;
  let prev: AtrBar | undefined;
  let atr = 0;
  for (let i = 0; i < bars.length; i++) {
    const b = bars[i]!;
    const tr = prev ? Math.max(b.h - b.l, Math.abs(b.h - prev.c), Math.abs(b.l - prev.c)) : b.h - b.l;
    if (i < length) atr = (atr * i + tr) / (i + 1);
    else atr = (atr * (length - 1) + tr) / length;
    prev = b;
  }
  return atr;
}
