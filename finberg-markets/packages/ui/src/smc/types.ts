// Re-export SMC types so the chart overlay UI can stay decoupled from the
// service implementation. Keep this in sync with services/smc-ai/src/types.ts.

export type Direction = 'bull' | 'bear';
export type Side = 'long' | 'short';

export interface SmcEvent {
  id: string;
  kind: string;                   // 'MS' | 'BOS' | 'CHOCH' | 'MSS' | 'FVG' | 'OB' | 'BB' | 'LIQ_SWEEP' | 'EQH' | 'EQL' | 'PD_ZONE' | 'LIQ_INT' | 'LIQ_EXT' | 'PDH' | 'PDL' | 'PWH' | 'PWL' | 'ASIA_H' | 'ASIA_L' | 'LDN_SWEEP' | 'NY_MANIP'
  symbol: string;
  timeframe: string;
  startedAt: number;
  endedAt?: number;
  active: boolean;
  mitigated?: boolean;
  direction?: Direction;
  side?: 'high' | 'low';
  price?: number;
  priceTop?: number;
  priceBottom?: number;
  midline?: number;
  ote62?: number;
  ote705?: number;
  ote79?: number;
  payload?: Record<string, unknown>;
}

export interface ScenarioTarget {
  rank: 1 | 2 | 3 | 4 | 5;
  price: number;
  label: string;
  rMultiple: number;
}

export interface ConfidenceBreakdown {
  htfBiasStrength: number;
  historicalAccuracy: number;
  sweepQuality: number;
  confluenceCount: number;
  rrQuality: number;
  volumeConfirmation: number;
}

export interface Scenario {
  id: string;
  symbol: string;
  assetClass: string;
  direction: Side;
  entryTimeframe: string;
  setupSignature: string;
  htfBias: { bias: 'bullish' | 'bearish' | 'neutral'; strength: number };
  entryLow: number;
  entryHigh: number;
  stopPrice: number;
  riskReward: number;
  targets: ScenarioTarget[];
  headline: string;
  narrativeMarkdown: string;
  riskWarningMarkdown: string;
  confidence: number;
  confidenceBreakdown: ConfidenceBreakdown;
  triggerEventId?: string;
  expiresAt?: number;
  createdAt: number;
}
