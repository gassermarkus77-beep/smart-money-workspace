// ============================================================================
// MTF aggregator — resamples a source TF up to any larger TF.
// Used when the caller only has, say, M1 bars and needs M5/M15/H1/H4/D1.
// ============================================================================

import type { Bar, Timeframe } from '@finberg/shared/market';
import { TIMEFRAME_SECONDS } from '@finberg/shared';

/** Aggregate a sequence of bars into the requested target timeframe. */
export function aggregateTo(source: Bar[], target: Timeframe, originTz = 'UTC'): Bar[] {
  if (source.length === 0) return [];
  const bucketMs = TIMEFRAME_SECONDS[target] * 1000;

  const out: Bar[] = [];
  let cur: Bar | null = null;

  for (const b of source) {
    const bucketStart = bucketStartMs(b.t, bucketMs, target, originTz);
    if (!cur || cur.t !== bucketStart) {
      if (cur) out.push(cur);
      cur = { t: bucketStart, o: b.o, h: b.h, l: b.l, c: b.c, v: b.v };
      if (b.n !== undefined) cur.n = b.n;
    } else {
      cur.h = Math.max(cur.h, b.h);
      cur.l = Math.min(cur.l, b.l);
      cur.c = b.c;
      cur.v += b.v;
      if (b.n !== undefined) cur.n = (cur.n ?? 0) + b.n;
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Snap a timestamp to the bucket start for the requested TF. */
function bucketStartMs(ts: number, bucketMs: number, tf: Timeframe, tz: string): number {
  // Sub-day timeframes: simple modulo arithmetic in UTC works.
  if (TIMEFRAME_SECONDS[tf] < 86_400) return ts - (ts % bucketMs);

  // Day / week / month — anchor to the user's timezone for the right session boundaries.
  const d = new Date(ts);
  if (tf === '1d') {
    const local = new Date(d.toLocaleString('en-US', { timeZone: tz }));
    local.setHours(0, 0, 0, 0);
    return local.getTime();
  }
  if (tf === '3d') return ts - (ts % (3 * 86_400_000));
  if (tf === '1w') {
    const local = new Date(d.toLocaleString('en-US', { timeZone: tz }));
    const day = local.getDay();                 // 0=Sun
    const diff = (day + 6) % 7;                 // ISO week — Monday start
    local.setHours(0, 0, 0, 0);
    local.setDate(local.getDate() - diff);
    return local.getTime();
  }
  if (tf === '1M') {
    const local = new Date(d.toLocaleString('en-US', { timeZone: tz }));
    local.setDate(1); local.setHours(0, 0, 0, 0);
    return local.getTime();
  }
  return ts - (ts % bucketMs);
}
