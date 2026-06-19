// ============================================================================
// Detector aggregator — runs every detector against one timeframe and returns
// a unified TimeframeState. Order matters because some detectors consume the
// output of earlier ones (e.g. MSS depends on sweeps; PD zones depend on the
// dominant swing pair).
// ============================================================================

import type { Bar, Timeframe } from '@finberg/shared/market';
import type { TimeframeState, SmcEvent } from '../types.js';
import { detectStructure } from './structure.js';
import { detectBosChochMss } from './bos-choch-mss.js';
import { detectFVG } from './fvg.js';
import { detectOrderBlocks } from './order-blocks.js';
import { detectBreakerBlocks } from './breaker-blocks.js';
import { detectLiquiditySweeps } from './liquidity-sweeps.js';
import { detectEqualHighsLows } from './equal-highs-lows.js';
import { detectPremiumDiscount } from './premium-discount.js';
import { classifyLiquidity } from './internal-external-liquidity.js';
import { detectSessionLevels, detectLondonSweep, detectNyManipulation } from './session-levels.js';

export interface RunDetectorsOptions {
  symbol: string;
  timeframe: Timeframe;
  timezone?: string;
}

export function runDetectors(bars: Bar[], opts: RunDetectorsOptions): TimeframeState {
  const { symbol, timeframe } = opts;

  // 1. Structure (swings + trend)
  const structure = detectStructure(bars, { swingStrength: swingStrengthFor(timeframe), internalSwingStrength: 1 });

  // 2. Session anchors needed by sweeps + patterns
  const sessionLevels = detectSessionLevels(bars, symbol, timeframe, { timezone: opts.timezone ?? 'UTC' });
  const pdhPdl = sessionLevels.filter(s => s.kind === 'PDH' || s.kind === 'PDL') as Array<Extract<SmcEvent, { kind: 'PDH' | 'PDL' }>>;
  const asia   = sessionLevels.filter(s => s.kind === 'ASIA_H' || s.kind === 'ASIA_L') as Array<Extract<SmcEvent, { kind: 'ASIA_H' | 'ASIA_L' }>>;

  // 3. Liquidity sweeps (includes session anchors as extra levels)
  const sweeps = detectLiquiditySweeps(bars, symbol, timeframe, {
    swingHighs: structure.allHighs,
    swingLows:  structure.allLows,
    extraLevels: [
      ...pdhPdl.map(p => ({ side: (p.kind === 'PDH' ? 'high' : 'low') as 'high' | 'low', price: p.price, label: p.kind })),
      ...asia.map(a => ({ side: (a.kind === 'ASIA_H' ? 'high' : 'low') as 'high' | 'low', price: a.price, label: a.kind })),
    ],
  });

  // 4. BOS / CHOCH / MSS — MSS depends on sweeps
  const { events: structureEvents } = detectBosChochMss(bars, { allHighs: structure.allHighs, allLows: structure.allLows }, timeframe, symbol, { sweeps });

  // 5. FVG, OB, BB
  const fvgs = detectFVG(bars, symbol, timeframe);
  const obs  = detectOrderBlocks(bars, symbol, timeframe);
  const bbs  = detectBreakerBlocks(obs, bars, symbol, timeframe);

  // 6. Equal Highs/Lows
  const eqs = detectEqualHighsLows(bars, structure.allHighs, structure.allLows, symbol, timeframe);

  // 7. PD zone (range from latest swing pair)
  const pd = detectPremiumDiscount({
    symbol, timeframe,
    ...(structure.lastSwingHigh ? { lastSwingHigh: structure.lastSwingHigh } : {}),
    ...(structure.lastSwingLow  ? { lastSwingLow:  structure.lastSwingLow }  : {}),
  });

  // 8. Internal/External liquidity classification
  const liquidity = pd
    ? classifyLiquidity({
        symbol, timeframe,
        rangeHigh: pd.priceTop, rangeLow: pd.priceBottom,
        highs: structure.allHighs, lows: structure.allLows,
      })
    : [];

  // 9. Session patterns
  const ldnSweeps = detectLondonSweep({ bars, symbol, timeframe, asiaLevels: asia, pdhPdl });
  const nyManip   = detectNyManipulation({ bars, symbol, timeframe, asiaLevels: asia, pdhPdl });

  // 10. Assemble
  const events: SmcEvent[] = [
    ...structureEvents,
    ...fvgs, ...obs, ...bbs,
    ...sweeps, ...eqs, ...liquidity,
    ...sessionLevels, ...ldnSweeps, ...nyManip,
    ...(pd ? [pd] : []),
  ];

  return {
    timeframe,
    events,
    structure: {
      trend: structure.trend,
      ...(structure.lastSwingHigh ? { lastSwingHigh: structure.lastSwingHigh } : {}),
      ...(structure.lastSwingLow  ? { lastSwingLow:  structure.lastSwingLow }  : {}),
      internalSwingsHigh: structure.internalSwingsHigh,
      internalSwingsLow:  structure.internalSwingsLow,
    },
    ...(pd ? { pdZone: pd } : {}),
    activeFVGs: fvgs.filter(f => f.active),
    activeOBs:  obs.filter(o => o.active),
    activeBreakers: bbs.filter(b => b.active),
  };
}

/** Adjust swing strength for the timeframe — bigger TF needs fewer bars confirmation. */
function swingStrengthFor(tf: Timeframe): number {
  switch (tf) {
    case '1m': case '3m': case '5m': return 5;
    case '15m': case '30m':           return 4;
    case '1h': case '2h': case '4h':  return 3;
    case '1d': case '1w':             return 2;
    default: return 3;
  }
}
