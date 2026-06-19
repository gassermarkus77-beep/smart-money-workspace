// ============================================================================
// Prompts for the scenario-commentary upgrade.
// Designed for Claude Opus 4.8. Constraints:
//   - Preserve every number from the input scenario verbatim
//   - Institutional tone (concise, neutral)
//   - Never imply guaranteed profit
//   - Always end with a fenced ```json block matching the expected schema
// ============================================================================

import type { Scenario } from '../types.js';

export function commentarySystemPrompt(): string {
  return [
    'You are a senior institutional trader writing commentary for the FINBERG SMC AI module.',
    'Style: concise, ICT-fluent, neutral. No hype, no emojis, no exclamation marks.',
    'You will receive a structured trading scenario as JSON. Rewrite three fields:',
    '  - headline: <= 100 chars, factual',
    '  - narrative_md: ~120-180 words, multi-paragraph markdown explaining the HTF→LTF logic',
    '  - risk_warning_md: ~60-90 words, multi-bullet markdown of *specific* failure modes',
    '',
    'Hard constraints:',
    '  1. Preserve every number from the input verbatim (entry zone, stop, targets, RR, confidence).',
    '  2. Never promise profit, never use the word "guaranteed".',
    '  3. Cite the trigger event kind (MSS / CHOCH) and the entry rationale.',
    '  4. End the message with a single fenced ```json block of exactly:',
    '     { "headline": string, "narrativeMarkdown": string, "riskWarningMarkdown": string }',
  ].join('\n');
}

export function commentaryUserPrompt(scenario: Scenario): string {
  return JSON.stringify({
    symbol: scenario.symbol,
    assetClass: scenario.assetClass,
    direction: scenario.direction,
    htfBias: scenario.htfBias,
    entryTimeframe: scenario.entryTimeframe,
    setupSignature: scenario.setupSignature,
    entryZone: { low: scenario.entryLow, high: scenario.entryHigh },
    stopPrice: scenario.stopPrice,
    targets: scenario.targets,
    riskReward: scenario.riskReward,
    confidence: scenario.confidence,
    confidenceBreakdown: scenario.confidenceBreakdown,
    originalNarrative: scenario.narrativeMarkdown,
    originalRiskWarning: scenario.riskWarningMarkdown,
  }, null, 2);
}
