// ============================================================================
// FINBERG SMC AI — Core Types
// Canonical event / scenario shapes. Re-exported into the chart overlay UI.
// ============================================================================

import type { Bar, Timeframe, AssetClass } from '@finberg/shared/market';

export type Direction = 'bull' | 'bear';
export type Side      = 'long' | 'short';

// ----- Swings & structure --------------------------------------------------
export interface Swing {
  time: number;          // epoch ms
  price: number;
  kind: 'HH' | 'HL' | 'LH' | 'LL';
  barIndex: number;
}

export interface MarketStructureState {
  trend: 'bullish' | 'bearish' | 'neutral';
  lastSwingHigh?: Swing;
  lastSwingLow?: Swing;
  internalSwingsHigh: Swing[];
  internalSwingsLow:  Swing[];
}

// ----- Detector event ------------------------------------------------------
export type SmcEventKind =
  | 'MS' | 'BOS' | 'CHOCH' | 'MSS'
  | 'FVG' | 'OB' | 'BB' | 'LIQ_SWEEP'
  | 'EQH' | 'EQL'
  | 'PD_ZONE' | 'LIQ_INT' | 'LIQ_EXT'
  | 'PDH' | 'PDL' | 'PWH' | 'PWL'
  | 'ASIA_H' | 'ASIA_L'
  | 'LDN_SWEEP' | 'NY_MANIP';

export interface SmcEventBase {
  id: string;
  kind: SmcEventKind;
  symbol: string;
  timeframe: Timeframe;
  startedAt: number;
  endedAt?: number;
  active: boolean;
  mitigated?: boolean;
  mitigatedAt?: number;
  payload?: Record<string, unknown>;
}

// Discriminated variants the UI relies on
export type SmcEvent =
  | (SmcEventBase & { kind: 'BOS' | 'CHOCH' | 'MSS'; direction: Direction; price: number })
  | (SmcEventBase & { kind: 'FVG' | 'OB' | 'BB'; direction: Direction; priceTop: number; priceBottom: number })
  | (SmcEventBase & { kind: 'LIQ_SWEEP'; direction: Direction; side: 'high' | 'low'; price: number })
  | (SmcEventBase & { kind: 'EQH' | 'EQL'; price: number })
  | (SmcEventBase & { kind: 'PD_ZONE'; priceTop: number; priceBottom: number; midline: number; ote62: number; ote705: number; ote79: number })
  | (SmcEventBase & { kind: 'LIQ_INT' | 'LIQ_EXT'; side: 'high' | 'low'; price: number })
  | (SmcEventBase & { kind: 'PDH' | 'PDL' | 'PWH' | 'PWL' | 'ASIA_H' | 'ASIA_L'; price: number })
  | (SmcEventBase & { kind: 'LDN_SWEEP' | 'NY_MANIP'; side: 'high' | 'low'; price: number })
  | (SmcEventBase & { kind: 'MS'; trend: 'bullish' | 'bearish' | 'neutral' });

// ----- Per-timeframe state --------------------------------------------------
export interface TimeframeState {
  timeframe: Timeframe;
  events: SmcEvent[];
  structure: MarketStructureState;
  pdZone?: Extract<SmcEvent, { kind: 'PD_ZONE' }>;
  activeFVGs: Array<Extract<SmcEvent, { kind: 'FVG' }>>;
  activeOBs:  Array<Extract<SmcEvent, { kind: 'OB' }>>;
  activeBreakers: Array<Extract<SmcEvent, { kind: 'BB' }>>;
}

export interface AnalyzeInput {
  symbol: string;
  assetClass: AssetClass;
  bars: Record<Timeframe, Bar[]>;    // pre-aggregated per TF; or single TF + aggregator
  asOf?: number;
}

// ----- Bias engine ----------------------------------------------------------
export interface BiasResult {
  bias: 'bullish' | 'bearish' | 'neutral';
  strength: number;                  // 0..1
  components: Record<Timeframe, { trend: 'bullish' | 'bearish' | 'neutral'; weight: number }>;
}

// ----- Scenario ------------------------------------------------------------
export interface ScenarioTarget {
  rank: 1 | 2 | 3 | 4 | 5;
  price: number;
  label: string;                     // 'PDH','external_liq','premium_extreme', ...
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
  assetClass: AssetClass;

  htfBias: BiasResult;
  entryTimeframe: Timeframe;
  setupSignature: string;

  direction: Side;
  entryLow: number;
  entryHigh: number;
  stopPrice: number;
  riskReward: number;
  targets: ScenarioTarget[];

  headline: string;
  narrativeMarkdown: string;
  riskWarningMarkdown: string;

  confidence: number;                // 0..1
  confidenceBreakdown: ConfidenceBreakdown;

  triggerEventId?: string;
  expiresAt?: number;
  createdAt: number;
}

export type { Bar, Timeframe, AssetClass };
