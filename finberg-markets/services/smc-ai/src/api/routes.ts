// ============================================================================
// HTTP routes for the SMC AI service.
// ============================================================================

import type { FastifyInstance } from 'fastify';
import type { Logger } from 'pino';
import type { Timeframe } from '@finberg/shared/market';
import { AnalyzeRequestSchema, BacktestRequestSchema, DetectRequestSchema } from './schemas.js';
import { runDetectors } from '../detectors/index.js';
import { computeBias } from '../scenario/bias-engine.js';
import { buildScenario } from '../scenario/scenario-builder.js';
import { upgradeCommentary } from '../scenario/commentary.js';
import { runBacktest } from '../backtest/engine.js';
import { normalize } from '../pipeline/normalizer.js';
import type { TimeframeState } from '../types.js';

export async function registerRoutes(app: FastifyInstance, logger: Logger): Promise<void> {

  // -------------------------------------------------------------------------
  // POST /v1/smc/detect — run detectors on a single timeframe
  // -------------------------------------------------------------------------
  app.post('/v1/smc/detect', async (req, reply) => {
    const parsed = DetectRequestSchema.safeParse(req.body);
    if (!parsed.success) { reply.code(400); return { error: 'validation', details: parsed.error.flatten() }; }
    const { symbol, timeframe, bars, timezone } = parsed.data;
    const state = runDetectors(normalize(bars), { symbol, timeframe, timezone });
    return state;
  });

  // -------------------------------------------------------------------------
  // POST /v1/smc/analyze — full pipeline: per-TF detectors + bias + scenario
  // -------------------------------------------------------------------------
  app.post('/v1/smc/analyze', async (req, reply) => {
    const parsed = AnalyzeRequestSchema.safeParse(req.body);
    if (!parsed.success) { reply.code(400); return { error: 'validation', details: parsed.error.flatten() }; }
    const { symbol, assetClass, bars, entryTimeframe, htfTimeframes, timezone, upgradeCommentary: useLlm } = parsed.data;

    const htfStates: TimeframeState[] = [];
    for (const tf of htfTimeframes) {
      const series = bars[tf];
      if (!series) continue;
      htfStates.push(runDetectors(normalize(series), { symbol, timeframe: tf, timezone }));
    }
    const ltfSeries = bars[entryTimeframe] ?? [];
    const ltfState = runDetectors(normalize(ltfSeries), { symbol, timeframe: entryTimeframe, timezone });

    const bias = computeBias(htfStates);
    const currentPrice = ltfSeries.length ? ltfSeries[ltfSeries.length - 1]!.c : 0;

    const scenario = buildScenario({
      symbol, assetClass, htfStates, ltfState, bias, currentPrice,
      ltfBars: ltfSeries,
    });

    let finalScenario = scenario;
    if (scenario && useLlm) {
      try {
        const upgraded = await upgradeCommentary(scenario);
        finalScenario = { ...scenario, ...upgraded };
      } catch (err) {
        logger.warn({ err }, 'LLM commentary upgrade failed; using fallback');
      }
    }

    return {
      symbol,
      bias,
      htfStates: htfStates.map(s => summarizeTfState(s)),
      ltfState: summarizeTfState(ltfState),
      scenario: finalScenario,
    };
  });

  // -------------------------------------------------------------------------
  // POST /v1/smc/backtest — walk-forward replay
  // -------------------------------------------------------------------------
  app.post('/v1/smc/backtest', async (req, reply) => {
    const parsed = BacktestRequestSchema.safeParse(req.body);
    if (!parsed.success) { reply.code(400); return { error: 'validation', details: parsed.error.flatten() }; }
    const { symbol, assetClass, bars, entryTimeframe, htfTimeframes, startAtBar, cooldownBars } = parsed.data;

    const normalized: Record<Timeframe, ReturnType<typeof normalize>> = {} as Record<Timeframe, ReturnType<typeof normalize>>;
    for (const [tf, series] of Object.entries(bars)) normalized[tf as Timeframe] = normalize(series ?? []);

    const summary = runBacktest({
      symbol, assetClass,
      bars: normalized,
      entryTimeframe, htfTimeframes,
      ...(startAtBar !== undefined ? { startAtBar } : {}),
      ...(cooldownBars !== undefined ? { cooldownBars } : {}),
    });
    return summary;
  });

  // -------------------------------------------------------------------------
  // Health
  // -------------------------------------------------------------------------
  app.get('/healthz', () => ({ status: 'ok' }));
  app.get('/readyz',  () => ({ status: 'ready' }));
}

function summarizeTfState(state: TimeframeState): unknown {
  return {
    timeframe: state.timeframe,
    trend: state.structure.trend,
    lastSwingHigh: state.structure.lastSwingHigh,
    lastSwingLow:  state.structure.lastSwingLow,
    pdZone: state.pdZone,
    activeFvgs: state.activeFVGs.length,
    activeObs: state.activeOBs.length,
    activeBreakers: state.activeBreakers.length,
    eventCount: state.events.length,
    events: state.events,
  };
}
