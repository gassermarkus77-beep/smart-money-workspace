// ============================================================================
// DataSource — owns the bar buffer for one (symbol, timeframe) pair.
// Backfill REST + realtime WebSocket merge happens here.
// ============================================================================

import type { Bar, Timeframe } from '@finberg/shared/market';
import { TIMEFRAME_SECONDS } from '@finberg/shared';

export class DataSource {
  private bars: Bar[] = [];
  private readonly intervalMs: number;
  private listeners = new Set<(bars: Bar[]) => void>();

  constructor(
    public readonly symbol: string,
    public readonly timeframe: Timeframe,
  ) {
    this.intervalMs = TIMEFRAME_SECONDS[timeframe] * 1000;
  }

  setBars(bars: Bar[]): void {
    // ensure sorted ascending by time
    this.bars = [...bars].sort((a, b) => a.t - b.t);
    this.emit();
  }

  getBars(): readonly Bar[] { return this.bars; }

  appendBar(bar: Bar): void {
    const last = this.bars[this.bars.length - 1];
    if (last && bar.t === last.t) {
      // update in place
      this.bars[this.bars.length - 1] = bar;
    } else if (!last || bar.t > last.t) {
      this.bars.push(bar);
    } else {
      // out-of-order — binary search insert
      const idx = this.bisectLeft(bar.t);
      if (this.bars[idx]?.t === bar.t) this.bars[idx] = bar;
      else this.bars.splice(idx, 0, bar);
    }
    this.emit();
  }

  /** Update the current forming bar from a tick. */
  applyTick(tickT: number, price: number, size: number): void {
    const bucketT = tickT - (tickT % this.intervalMs);
    const last = this.bars[this.bars.length - 1];
    if (last && last.t === bucketT) {
      last.h = Math.max(last.h, price);
      last.l = Math.min(last.l, price);
      last.c = price;
      last.v += size;
    } else {
      this.bars.push({ t: bucketT, o: price, h: price, l: price, c: price, v: size });
    }
    this.emit();
  }

  subscribe(fn: (bars: Bar[]) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    for (const l of this.listeners) l(this.bars);
  }

  private bisectLeft(t: number): number {
    let lo = 0, hi = this.bars.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (this.bars[mid]!.t < t) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}
