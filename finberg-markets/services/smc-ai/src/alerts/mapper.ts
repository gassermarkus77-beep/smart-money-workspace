// ============================================================================
// Detection → Alert mapper
//
// Converts SMC events into structured payloads the notifications service can
// fan out. We deliberately do not mint trade signals here — we just surface
// "X happened on Y". Trade scenarios are emitted separately.
// ============================================================================

import type { SmcEvent, Scenario } from '../types.js';

export interface AlertPayload {
  idempotencyKey: string;
  template: string;
  payload: Record<string, unknown>;
}

export function mapEventToAlert(event: SmcEvent, userId: string): AlertPayload {
  return {
    idempotencyKey: `${userId}:${event.id}`,
    template: `smc.${event.kind.toLowerCase()}`,
    payload: {
      symbol: event.symbol,
      timeframe: event.timeframe,
      kind: event.kind,
      at: event.startedAt,
      ...event,
    },
  };
}

export function mapScenarioToAlert(scenario: Scenario, userId: string): AlertPayload {
  return {
    idempotencyKey: `${userId}:${scenario.id}`,
    template: 'smc.scenario',
    payload: {
      headline: scenario.headline,
      symbol: scenario.symbol,
      direction: scenario.direction,
      entryLow: scenario.entryLow,
      entryHigh: scenario.entryHigh,
      stopPrice: scenario.stopPrice,
      targets: scenario.targets,
      riskReward: scenario.riskReward,
      confidence: scenario.confidence,
    },
  };
}
