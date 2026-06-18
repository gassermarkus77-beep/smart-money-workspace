// ============================================================================
// Risk management primitives
//   - position size from account risk %
//   - RR computation
//   - SL placement rules per setup type
//   - target ladder from liquidity stack
// ============================================================================

import type { AssetClass } from '@finberg/shared/market';
import type { ScenarioTarget, Side, SmcEvent } from '../types.js';

export interface RiskInputs {
  side: Side;
  entryLow: number;
  entryHigh: number;
  stopPrice: number;
  /** Liquidity stack sorted by distance from entry (closest first). */
  liquidityStack: Array<{ price: number; label: string }>;
}

/** Build a ladder of up to 5 take-profit levels with R-multiples from the stack. */
export function buildTargetLadder(inputs: RiskInputs): ScenarioTarget[] {
  const { side, entryLow, entryHigh, stopPrice, liquidityStack } = inputs;
  const entryMid = (entryLow + entryHigh) / 2;
  const riskPerUnit = Math.abs(entryMid - stopPrice);
  if (riskPerUnit === 0) return [];

  const candidates = liquidityStack
    .filter(l => (side === 'long' ? l.price > entryHigh : l.price < entryLow))
    .map(l => ({ ...l, distance: Math.abs(l.price - entryMid) }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 5);

  return candidates.map((l, i) => ({
    rank: (i + 1) as ScenarioTarget['rank'],
    price: l.price,
    label: l.label,
    rMultiple: round(l.distance / riskPerUnit, 3),
  }));
}

/** Aggregate RR — uses the first non-trivial target (>= 1R). */
export function aggregateRR(targets: ScenarioTarget[]): number {
  const first = targets.find(t => t.rMultiple >= 1) ?? targets[0];
  return first ? first.rMultiple : 0;
}

/** Position size in base units given account size and risk per trade %. */
export function positionSize(
  accountSize: number,
  riskPct: number,
  riskPerUnit: number,
): number {
  if (riskPerUnit <= 0) return 0;
  return (accountSize * (riskPct / 100)) / riskPerUnit;
}

/** Suggest a stop price for the proposed setup. */
export function suggestStop(
  side: Side,
  entryLow: number,
  entryHigh: number,
  bufferAtr: number,
  sweepLevel?: number,
  obBottom?: number,
  obTop?: number,
): number {
  // Preference: just past the swept liquidity. Fallback: OB extreme + buffer.
  if (side === 'long') {
    if (sweepLevel !== undefined) return sweepLevel - bufferAtr;
    if (obBottom !== undefined) return obBottom - bufferAtr;
    return entryLow - bufferAtr;
  }
  if (sweepLevel !== undefined) return sweepLevel + bufferAtr;
  if (obTop !== undefined) return obTop + bufferAtr;
  return entryHigh + bufferAtr;
}

/** Per-asset-class calibration table — used by the scenario builder for tolerances + min RR. */
export const ASSET_CALIBRATION: Record<AssetClass, { minRR: number; stopBufferAtr: number }> = {
  forex:     { minRR: 2.5, stopBufferAtr: 0.1 },
  crypto:    { minRR: 2.5, stopBufferAtr: 0.2 },
  index:     { minRR: 2.0, stopBufferAtr: 0.15 },
  commodity: { minRR: 2.5, stopBufferAtr: 0.2 },
  stock:     { minRR: 2.0, stopBufferAtr: 0.15 },
  bond:      { minRR: 2.0, stopBufferAtr: 0.1 },
};

/** Filter helper: drop any liquidity event we shouldn't target (e.g. opposite side). */
export function liquidityTargetsFor(
  side: Side,
  events: SmcEvent[],
  currentPrice: number,
): Array<{ price: number; label: string }> {
  const out: Array<{ price: number; label: string }> = [];
  for (const e of events) {
    let price: number | undefined, label = '';
    switch (e.kind) {
      case 'PDH': price = e.price; label = 'PDH'; break;
      case 'PDL': price = e.price; label = 'PDL'; break;
      case 'PWH': price = e.price; label = 'PWH'; break;
      case 'PWL': price = e.price; label = 'PWL'; break;
      case 'ASIA_H': price = e.price; label = 'Asia High'; break;
      case 'ASIA_L': price = e.price; label = 'Asia Low'; break;
      case 'EQH': price = e.price; label = 'Equal Highs'; break;
      case 'EQL': price = e.price; label = 'Equal Lows'; break;
      case 'LIQ_EXT': price = e.price; label = `External ${e.side === 'high' ? 'High' : 'Low'}`; break;
      default: break;
    }
    if (price === undefined) continue;
    // Only forward-facing targets
    if (side === 'long' && price <= currentPrice) continue;
    if (side === 'short' && price >= currentPrice) continue;
    out.push({ price, label });
  }
  return out;
}

function round(x: number, p: number): number { const m = 10 ** p; return Math.round(x * m) / m; }
