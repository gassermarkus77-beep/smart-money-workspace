// ============================================================================
// HTF bias engine
//
// Takes structure trends from D1, H4, H1 (or whichever HTFs were analyzed),
// applies a weighted vote, and returns a single bias + strength in [0, 1].
//
// Weights default to D1:0.5, H4:0.3, H1:0.2 — institutional bias is driven
// by the higher timeframes; the lower TF only fine-tunes. Callers can pass
// custom weights for specific asset classes (e.g. crypto might weight H4
// higher than D1 for swing setups).
// ============================================================================

import type { Timeframe } from '@finberg/shared/market';
import type { BiasResult, TimeframeState } from '../types.js';

const DEFAULT_WEIGHTS: Partial<Record<Timeframe, number>> = {
  '1d': 0.5,
  '4h': 0.3,
  '1h': 0.2,
};

export interface BiasOptions {
  weights?: Partial<Record<Timeframe, number>>;
}

export function computeBias(states: TimeframeState[], opts: BiasOptions = {}): BiasResult {
  const weights = opts.weights ?? DEFAULT_WEIGHTS;

  let bullScore = 0, bearScore = 0, total = 0;
  const components: BiasResult['components'] = {} as BiasResult['components'];

  for (const s of states) {
    const w = weights[s.timeframe] ?? 0;
    if (w === 0) continue;
    components[s.timeframe] = { trend: s.structure.trend, weight: w };
    total += w;
    if (s.structure.trend === 'bullish') bullScore += w;
    else if (s.structure.trend === 'bearish') bearScore += w;
  }

  if (total === 0) {
    return { bias: 'neutral', strength: 0, components };
  }

  const bullPct = bullScore / total;
  const bearPct = bearScore / total;

  if (bullPct > bearPct && bullPct >= 0.5) {
    return { bias: 'bullish', strength: bullPct, components };
  }
  if (bearPct > bullPct && bearPct >= 0.5) {
    return { bias: 'bearish', strength: bearPct, components };
  }
  return { bias: 'neutral', strength: Math.max(bullPct, bearPct), components };
}
