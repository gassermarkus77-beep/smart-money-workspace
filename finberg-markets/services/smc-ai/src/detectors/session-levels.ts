// ============================================================================
// Session level detectors
//
// Produces:
//   - PDH / PDL — previous trading day high / low (uses NY close as the day boundary)
//   - PWH / PWL — previous trading week high / low (Monday-Sunday in NY)
//   - ASIA_H / ASIA_L — current Asia session extreme (Tokyo 00:00-07:00 UTC)
//
// Times are derived from a configurable timezone (default 'America/New_York'
// for futures/equities; the caller can override per-asset, e.g. crypto uses
// 24/7 UTC days). Asia/London/NY kill-zones use the standard ICT windows.
// ============================================================================

import { randomUUID } from 'node:crypto';
import type { Bar, Timeframe } from '@finberg/shared/market';
import type { SmcEvent } from '../types.js';

export interface SessionOptions {
  /** Anchor TZ for day/week boundaries. Default 'America/New_York'. */
  timezone?: string;
  /** Bar timeframe — used to detect intraday boundaries. */
  barTimeframe?: Timeframe;
}

const ASIA_START_UTC_H   = 0;
const ASIA_END_UTC_H     = 7;
const LONDON_START_UTC_H = 7;
const LONDON_END_UTC_H   = 12;
const NY_START_UTC_H     = 13;
const NY_END_UTC_H       = 17;

export function detectSessionLevels(
  bars: Bar[],
  symbol: string,
  timeframe: Timeframe,
  opts: SessionOptions = {},
): Array<Extract<SmcEvent, { kind: 'PDH' | 'PDL' | 'PWH' | 'PWL' | 'ASIA_H' | 'ASIA_L' }>> {
  const tz = opts.timezone ?? 'UTC';
  const out: Array<Extract<SmcEvent, { kind: 'PDH' | 'PDL' | 'PWH' | 'PWL' | 'ASIA_H' | 'ASIA_L' }>> = [];

  const dayKeys = bars.map(b => dayKey(b.t, tz));
  const weekKeys = bars.map(b => weekKey(b.t, tz));

  // ----- Previous Day H/L -------------------------------------------------
  const dayGroups = groupBy(bars, dayKeys);
  const dayKeysOrdered = Object.keys(dayGroups).sort();
  for (let i = 1; i < dayKeysOrdered.length; i++) {
    const prevDay = dayGroups[dayKeysOrdered[i - 1]!]!;
    const today   = dayGroups[dayKeysOrdered[i]!]!;
    const high = Math.max(...prevDay.map(b => b.h));
    const low  = Math.min(...prevDay.map(b => b.l));
    const startedAt = today[0]!.t;
    out.push(mkLevel('PDH', high, startedAt, symbol, timeframe));
    out.push(mkLevel('PDL', low,  startedAt, symbol, timeframe));
  }

  // ----- Previous Week H/L ------------------------------------------------
  const weekGroups = groupBy(bars, weekKeys);
  const weekKeysOrdered = Object.keys(weekGroups).sort();
  for (let i = 1; i < weekKeysOrdered.length; i++) {
    const prevWeek = weekGroups[weekKeysOrdered[i - 1]!]!;
    const thisWeek = weekGroups[weekKeysOrdered[i]!]!;
    const high = Math.max(...prevWeek.map(b => b.h));
    const low  = Math.min(...prevWeek.map(b => b.l));
    const startedAt = thisWeek[0]!.t;
    out.push(mkLevel('PWH', high, startedAt, symbol, timeframe));
    out.push(mkLevel('PWL', low,  startedAt, symbol, timeframe));
  }

  // ----- Asia session H/L per day ----------------------------------------
  for (const [dk, group] of Object.entries(dayGroups)) {
    const asia = group.filter(b => {
      const hr = new Date(b.t).getUTCHours();
      return hr >= ASIA_START_UTC_H && hr < ASIA_END_UTC_H;
    });
    if (asia.length === 0) continue;
    const high = Math.max(...asia.map(b => b.h));
    const low  = Math.min(...asia.map(b => b.l));
    const startedAt = asia[asia.length - 1]!.t;
    out.push(mkLevel('ASIA_H', high, startedAt, symbol, timeframe, { day: dk }));
    out.push(mkLevel('ASIA_L', low,  startedAt, symbol, timeframe, { day: dk }));
  }

  return out;
}

// ----- London / NY session pattern detectors --------------------------------
// These produce LDN_SWEEP / NY_MANIP events when the canonical pattern fires.

export interface SessionPatternInput {
  bars: Bar[];
  symbol: string;
  timeframe: Timeframe;
  asiaLevels: Array<Extract<SmcEvent, { kind: 'ASIA_H' | 'ASIA_L' }>>;
  pdhPdl:     Array<Extract<SmcEvent, { kind: 'PDH' | 'PDL' }>>;
}

export function detectLondonSweep(input: SessionPatternInput): Array<Extract<SmcEvent, { kind: 'LDN_SWEEP' }>> {
  const out: Array<Extract<SmcEvent, { kind: 'LDN_SWEEP' }>> = [];
  const { bars, symbol, timeframe, asiaLevels } = input;

  for (let i = 1; i < bars.length; i++) {
    const b = bars[i]!;
    const hr = new Date(b.t).getUTCHours();
    if (hr < LONDON_START_UTC_H || hr >= LONDON_END_UTC_H) continue;
    const sameDay = dayKey(b.t, 'UTC');
    const ah = asiaLevels.find(a => a.kind === 'ASIA_H' && (a.payload?.['day'] as string) === sameDay);
    const al = asiaLevels.find(a => a.kind === 'ASIA_L' && (a.payload?.['day'] as string) === sameDay);
    if (ah && b.h > ah.price && b.c < ah.price) {
      out.push({ id: randomUUID(), kind: 'LDN_SWEEP', side: 'high', price: ah.price, symbol, timeframe, startedAt: b.t, active: false, payload: { sweptLabel: 'asia_high' } });
    }
    if (al && b.l < al.price && b.c > al.price) {
      out.push({ id: randomUUID(), kind: 'LDN_SWEEP', side: 'low', price: al.price, symbol, timeframe, startedAt: b.t, active: false, payload: { sweptLabel: 'asia_low' } });
    }
  }
  return out;
}

export function detectNyManipulation(input: SessionPatternInput): Array<Extract<SmcEvent, { kind: 'NY_MANIP' }>> {
  const out: Array<Extract<SmcEvent, { kind: 'NY_MANIP' }>> = [];
  const { bars, symbol, timeframe, pdhPdl } = input;
  for (let i = 1; i < bars.length; i++) {
    const b = bars[i]!;
    const hr = new Date(b.t).getUTCHours();
    if (hr < NY_START_UTC_H || hr >= NY_END_UTC_H) continue;
    const pdh = pdhPdl.find(p => p.kind === 'PDH' && p.startedAt <= b.t);
    const pdl = pdhPdl.find(p => p.kind === 'PDL' && p.startedAt <= b.t);
    if (pdh && b.h > pdh.price && b.c < pdh.price) {
      out.push({ id: randomUUID(), kind: 'NY_MANIP', side: 'high', price: pdh.price, symbol, timeframe, startedAt: b.t, active: false, payload: { sweptLabel: 'PDH' } });
    }
    if (pdl && b.l < pdl.price && b.c > pdl.price) {
      out.push({ id: randomUUID(), kind: 'NY_MANIP', side: 'low', price: pdl.price, symbol, timeframe, startedAt: b.t, active: false, payload: { sweptLabel: 'PDL' } });
    }
  }
  return out;
}

// ----- helpers --------------------------------------------------------------
function mkLevel<K extends 'PDH' | 'PDL' | 'PWH' | 'PWL' | 'ASIA_H' | 'ASIA_L'>(
  kind: K,
  price: number,
  startedAt: number,
  symbol: string,
  timeframe: Timeframe,
  extraPayload: Record<string, unknown> = {},
): Extract<SmcEvent, { kind: K }> {
  return {
    id: randomUUID(),
    kind,
    price,
    symbol, timeframe,
    startedAt,
    active: true,
    payload: extraPayload,
  } as Extract<SmcEvent, { kind: K }>;
}

function dayKey(ts: number, tz: string): string {
  const d = new Date(ts);
  if (tz === 'UTC') return d.toISOString().slice(0, 10);
  return new Date(d.toLocaleString('en-US', { timeZone: tz })).toISOString().slice(0, 10);
}
function weekKey(ts: number, tz: string): string {
  const d = new Date(ts);
  const local = tz === 'UTC' ? d : new Date(d.toLocaleString('en-US', { timeZone: tz }));
  const day = local.getUTCDay();
  const diff = (day + 6) % 7;
  local.setUTCDate(local.getUTCDate() - diff);
  return local.toISOString().slice(0, 10);
}
function groupBy<T>(arr: T[], keys: string[]): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (let i = 0; i < arr.length; i++) {
    const k = keys[i]!;
    (out[k] ??= []).push(arr[i]!);
  }
  return out;
}
