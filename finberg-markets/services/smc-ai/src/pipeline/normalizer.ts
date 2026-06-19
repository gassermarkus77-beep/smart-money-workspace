// ============================================================================
// Normalizer — guarantees the bar array is monotonic ascending in time, has
// no NaN OHLC, no duplicate timestamps, and no zero-volume phantom bars.
// ============================================================================

import type { Bar } from '@finberg/shared/market';

export interface NormalizeOptions {
  dedupe?: boolean;
  dropZeroVolume?: boolean;
  fillGaps?: boolean;        // if true, copy-forward close into missing buckets
  bucketMs?: number;         // required if fillGaps=true
}

export function normalize(bars: Bar[], opts: NormalizeOptions = {}): Bar[] {
  let out = bars.filter(b =>
    Number.isFinite(b.o) && Number.isFinite(b.h) &&
    Number.isFinite(b.l) && Number.isFinite(b.c) &&
    b.h >= b.l
  );

  out.sort((a, b) => a.t - b.t);

  if (opts.dedupe !== false) {
    const seen = new Set<number>();
    out = out.filter(b => seen.has(b.t) ? false : (seen.add(b.t), true));
  }

  if (opts.dropZeroVolume) {
    out = out.filter(b => b.v > 0);
  }

  if (opts.fillGaps && opts.bucketMs && out.length > 1) {
    const filled: Bar[] = [];
    for (let i = 0; i < out.length; i++) {
      const cur = out[i]!;
      filled.push(cur);
      const next = out[i + 1];
      if (!next) break;
      for (let t = cur.t + opts.bucketMs; t < next.t; t += opts.bucketMs) {
        filled.push({ t, o: cur.c, h: cur.c, l: cur.c, c: cur.c, v: 0 });
      }
    }
    out = filled;
  }

  return out;
}
