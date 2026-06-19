// ============================================================================
// Scenario builder — HTF bias + LTF trigger → trading scenario
//
// This is the orchestration centerpiece. Inputs:
//   - per-TF detector states
//   - HTF bias result
//   - current price
//   - asset class (for calibration)
//
// Output: a Scenario or null if no valid setup exists. Confidence has an
// explicit breakdown so the UI can show *why* a setup scored what it did.
// ============================================================================

import { randomUUID } from 'node:crypto';
import type { AssetClass, Timeframe } from '@finberg/shared/market';
import type {
  Scenario, ConfidenceBreakdown, BiasResult, TimeframeState, Side, SmcEvent,
} from '../types.js';
import { findEntry } from './entry-finder.js';
import {
  ASSET_CALIBRATION, suggestStop, buildTargetLadder, aggregateRR, liquidityTargetsFor,
} from './risk-manager.js';
import { rollingAtrLast } from './util.js';

export interface BuildScenarioInput {
  symbol: string;
  assetClass: AssetClass;
  htfStates: TimeframeState[];        // D1, H4, H1
  ltfState:  TimeframeState;          // M15 / M5 / M1
  bias: BiasResult;
  currentPrice: number;
  /** Historical accuracy of similar setup signatures, in [0, 1]. Optional. */
  historicalAccuracy?: number;
  /** Latest ATR on the entry TF, for stop buffering. */
  ltfBars?: Array<{ h: number; l: number; c: number }>;
  /** ISO timestamp for scenario expiry; default = +24h. */
  expiresAt?: number;
}

const HEADLINE_TEMPLATES: Record<Side, (sym: string, trigger: string) => string> = {
  long:  (sym, trig) => `${sym} — bullish ${trig}: dip-buy setup forming`,
  short: (sym, trig) => `${sym} — bearish ${trig}: rally-sell setup forming`,
};

export function buildScenario(input: BuildScenarioInput): Scenario | null {
  if (input.bias.bias === 'neutral') return null;
  const side: Side = input.bias.bias === 'bullish' ? 'long' : 'short';

  // 1. Find the entry zone on the LTF
  const htfPd = input.htfStates.find(s => s.pdZone)?.pdZone;
  const entry = findEntry(input.ltfState, htfPd, side, input.currentPrice);
  if (!entry) return null;

  // 2. Stop placement
  const calib = ASSET_CALIBRATION[input.assetClass];
  const atrBuffer = input.ltfBars ? rollingAtrLast(input.ltfBars, 14) * calib.stopBufferAtr : (entry.zoneHigh - entry.zoneLow) * 0.5;
  const recentSweep = input.ltfState.events
    .filter(e => e.kind === 'LIQ_SWEEP' && e.direction === (side === 'long' ? 'bull' : 'bear'))
    .at(-1) as Extract<SmcEvent, { kind: 'LIQ_SWEEP' }> | undefined;
  const stopPrice = suggestStop(
    side,
    entry.zoneLow,
    entry.zoneHigh,
    atrBuffer,
    recentSweep?.price,
    side === 'long' ? entry.zoneLow : undefined,
    side === 'short' ? entry.zoneHigh : undefined,
  );

  // 3. Targets — liquidity stack across all HTF states
  const liqEvents: SmcEvent[] = input.htfStates.flatMap(s => s.events);
  const targets = buildTargetLadder({
    side, entryLow: entry.zoneLow, entryHigh: entry.zoneHigh, stopPrice,
    liquidityStack: liquidityTargetsFor(side, liqEvents, input.currentPrice),
  });
  const rr = aggregateRR(targets);
  if (rr < calib.minRR) return null;     // setup too tight — prune

  // 4. Confidence breakdown
  const breakdown = computeConfidenceBreakdown(input, entry, rr);
  const confidence = aggregateConfidence(breakdown);

  // 5. Headline + setup signature
  const trigger = entry.triggerEvent.kind === 'MSS' ? 'MSS' : 'CHOCH';
  const headline = HEADLINE_TEMPLATES[side](input.symbol, trigger);
  const setupSignature = makeSignature(side, trigger, entry, input.ltfState.timeframe);

  // 6. Narrative + risk warning (plain text fallback; LLM upgrade in commentary.ts)
  const narrativeMarkdown = composeNarrative(input, side, entry, stopPrice, targets, rr);
  const riskWarningMarkdown = composeRiskWarning(side, recentSweep, calib.minRR);

  return {
    id: randomUUID(),
    symbol: input.symbol,
    assetClass: input.assetClass,
    htfBias: input.bias,
    entryTimeframe: input.ltfState.timeframe,
    setupSignature,
    direction: side,
    entryLow: entry.zoneLow,
    entryHigh: entry.zoneHigh,
    stopPrice,
    riskReward: rr,
    targets,
    headline,
    narrativeMarkdown,
    riskWarningMarkdown,
    confidence,
    confidenceBreakdown: breakdown,
    triggerEventId: entry.triggerEvent.id,
    expiresAt: input.expiresAt ?? Date.now() + 24 * 3600 * 1000,
    createdAt: Date.now(),
  };
}

// ----- Confidence ----------------------------------------------------------
function computeConfidenceBreakdown(
  input: BuildScenarioInput,
  entry: ReturnType<typeof findEntry> & object,
  rr: number,
): ConfidenceBreakdown {
  const htfBiasStrength    = clamp(input.bias.strength);
  const historicalAccuracy = clamp(input.historicalAccuracy ?? 0.5);

  const sweep = input.ltfState.events.find(e => e.kind === 'LIQ_SWEEP') as Extract<SmcEvent, { kind: 'LIQ_SWEEP' }> | undefined;
  const sweepDepth = (sweep?.payload?.['depthAtr'] as number) ?? 0;
  const sweepQuality = clamp(Math.min(1, sweepDepth / 0.5));

  const confluenceCount = clamp(entry.confluence.length / 4);
  const rrQuality = clamp(Math.min(1, (rr - 2) / 3));   // 2R → 0, 5R → 1
  const volumeConfirmation = 0.5;                       // placeholder until volume profile is wired

  return { htfBiasStrength, historicalAccuracy, sweepQuality, confluenceCount, rrQuality, volumeConfirmation };
}

function aggregateConfidence(b: ConfidenceBreakdown): number {
  return clamp(
    0.35 * b.htfBiasStrength +
    0.25 * b.historicalAccuracy +
    0.15 * b.sweepQuality +
    0.10 * b.confluenceCount +
    0.10 * b.rrQuality +
    0.05 * b.volumeConfirmation,
  );
}

// ----- Narrative -----------------------------------------------------------
function composeNarrative(
  input: BuildScenarioInput,
  side: Side,
  entry: ReturnType<typeof findEntry> & object,
  stop: number,
  targets: Scenario['targets'],
  rr: number,
): string {
  const htfList = Object.entries(input.bias.components)
    .map(([tf, c]) => `**${tf.toUpperCase()}** ${c.trend}`)
    .join(' · ');
  const targetLines = targets.map(t => `- TP${t.rank} → ${fmt(t.price)} (${t.label}, ${t.rMultiple}R)`).join('\n');
  const direction = side === 'long' ? 'bullish' : 'bearish';

  return [
    `**HTF bias**: ${htfList} → ${input.bias.bias} (strength ${(input.bias.strength * 100).toFixed(0)}%)`,
    ``,
    `**Trigger**: ${entry.triggerEvent.kind} on ${input.ltfState.timeframe}.`,
    ``,
    `**Entry rationale**: ${entry.rationale}.`,
    ``,
    `**Plan**`,
    `- Entry zone: ${fmt(entry.zoneLow)} – ${fmt(entry.zoneHigh)}`,
    `- Stop: ${fmt(stop)} (below recent swept liquidity)`,
    targetLines,
    `- RR (to first qualifying target): ${rr.toFixed(2)}R`,
    ``,
    `This is a ${direction} continuation idea anchored in HTF structure. The LTF trigger should be respected on the first touch; later touches degrade the edge.`,
  ].join('\n');
}

function composeRiskWarning(side: Side, sweep: Extract<SmcEvent, { kind: 'LIQ_SWEEP' }> | undefined, minRR: number): string {
  const lines: string[] = ['**Risk warning**', ''];
  if (!sweep) lines.push('- No clear liquidity sweep preceded the setup; entries without a sweep have higher failure rates.');
  lines.push(`- Minimum RR for this asset class is ${minRR}R; sub-${minRR}R setups were pruned but check broker spread/slippage.`);
  lines.push('- This is analysis, **not financial advice**. Position sizing is your responsibility.');
  lines.push(`- The setup invalidates the moment price closes ${side === 'long' ? 'below the stop' : 'above the stop'}.`);
  return lines.join('\n');
}

// ----- Misc ----------------------------------------------------------------
function makeSignature(side: Side, trigger: string, entry: ReturnType<typeof findEntry> & object, tf: Timeframe): string {
  const confluenceKinds = entry.confluence.map(c => c.kind).sort().join('+');
  return `${side}_${trigger.toLowerCase()}_${tf}_${confluenceKinds}`;
}

function fmt(x: number): string {
  if (x >= 1000) return x.toFixed(2);
  if (x >= 1)    return x.toFixed(4);
  return x.toPrecision(5);
}
function clamp(x: number): number { return Math.max(0, Math.min(1, x)); }
