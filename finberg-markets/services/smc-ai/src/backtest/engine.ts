// ============================================================================
// Walk-forward backtest engine
//
// For each bar t in [start..end], the engine:
//   1. Slices history up to bar t (no lookahead)
//   2. Runs the SMC detectors on each TF
//   3. Builds a scenario; if one exists, paper-trades it forward
//   4. Records the outcome (TP hit / SL hit / expired) and R-multiple
//
// Output:
//   - run summary (win rate, avg R, profit factor, expectancy, max DD)
//   - per-trade detail
//   - per-signature rollup (which setups work best)
// ============================================================================

import type { Bar, Timeframe, AssetClass } from '@finberg/shared/market';
import { runDetectors } from '../detectors/index.js';
import { computeBias } from '../scenario/bias-engine.js';
import { buildScenario } from '../scenario/scenario-builder.js';
import type { Scenario, TimeframeState } from '../types.js';

export interface BacktestInput {
  symbol: string;
  assetClass: AssetClass;
  /** Bars keyed by timeframe. The "entry" TF must be present and is the time axis we walk. */
  bars: Record<Timeframe, Bar[]>;
  entryTimeframe: Timeframe;
  htfTimeframes: Timeframe[];             // e.g. ['1h','4h','1d']
  startAtBar?: number;                    // skip warmup
  cooldownBars?: number;                  // bars between scenarios on the same side
  /** Optional override for asset-class min-RR rejection. */
  minRR?: number;
}

export interface BacktestTrade {
  scenarioId: string;
  signature: string;
  direction: 'long' | 'short';
  enteredAt: number;
  exitedAt: number;
  entryPrice: number;
  exitPrice: number;
  stopPrice: number;
  rMultiple: number;
  targetHit?: number;                     // 1..5 if a TP, undefined if SL/expiry
  barsHeld: number;
}

export interface BacktestSummary {
  trades: BacktestTrade[];
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  avgR: number;
  expectancyR: number;
  profitFactor: number;
  maxDrawdownR: number;
  bySignature: Record<string, { count: number; winRate: number; avgR: number; expectancyR: number }>;
}

export function runBacktest(input: BacktestInput): BacktestSummary {
  const ltfBars = input.bars[input.entryTimeframe] ?? [];
  if (ltfBars.length < 200) return emptySummary();

  const trades: BacktestTrade[] = [];
  const start = input.startAtBar ?? 200;
  let lastTradeBar = -Infinity;
  const cooldown = input.cooldownBars ?? 20;

  for (let i = start; i < ltfBars.length - 1; i++) {
    if (i - lastTradeBar < cooldown) continue;

    // Slice all TFs up to current LTF time
    const tHere = ltfBars[i]!.t;
    const ltfSlice = ltfBars.slice(0, i + 1);
    const htfStates: TimeframeState[] = input.htfTimeframes.map(tf => {
      const series = (input.bars[tf] ?? []).filter(b => b.t <= tHere);
      return runDetectors(series, { symbol: input.symbol, timeframe: tf });
    });
    const ltfState = runDetectors(ltfSlice, { symbol: input.symbol, timeframe: input.entryTimeframe });
    const bias = computeBias(htfStates);

    const scenario = buildScenario({
      symbol: input.symbol,
      assetClass: input.assetClass,
      htfStates,
      ltfState,
      bias,
      currentPrice: ltfBars[i]!.c,
      ltfBars: ltfSlice,
    });
    if (!scenario) continue;

    // Paper-trade forward
    const result = simulateTrade(scenario, ltfBars, i);
    if (!result) continue;
    trades.push(result);
    lastTradeBar = i;
  }

  return summarize(trades);
}

// ----- Trade simulation ----------------------------------------------------
function simulateTrade(scenario: Scenario, bars: Bar[], fromIdx: number): BacktestTrade | null {
  const entryMid = (scenario.entryLow + scenario.entryHigh) / 2;
  const stop = scenario.stopPrice;
  const isLong = scenario.direction === 'long';

  // 1. Wait for price to reach the entry zone
  let entryIdx = -1;
  for (let j = fromIdx + 1; j < bars.length && bars[j]!.t < (scenario.expiresAt ?? Infinity); j++) {
    const b = bars[j]!;
    const hit = isLong ? (b.l <= scenario.entryHigh && b.h >= scenario.entryLow)
                       : (b.h >= scenario.entryLow  && b.l <= scenario.entryHigh);
    if (hit) { entryIdx = j; break; }
  }
  if (entryIdx === -1) return null;

  // 2. From entryIdx forward, see what triggers first: stop or any TP
  const entryPrice = entryMid;
  const risk = Math.abs(entryPrice - stop);
  if (risk === 0) return null;

  for (let j = entryIdx + 1; j < bars.length; j++) {
    const b = bars[j]!;
    // Stop hit?
    if (isLong  && b.l <= stop) return finishTrade(scenario, entryIdx, j, entryPrice, stop, -1, j - entryIdx);
    if (!isLong && b.h >= stop) return finishTrade(scenario, entryIdx, j, entryPrice, stop, -1, j - entryIdx);

    // Targets — check in order, take first hit
    for (const t of scenario.targets) {
      if (isLong  && b.h >= t.price) return finishTrade(scenario, entryIdx, j, entryPrice, t.price, t.rank, j - entryIdx);
      if (!isLong && b.l <= t.price) return finishTrade(scenario, entryIdx, j, entryPrice, t.price, t.rank, j - entryIdx);
    }
  }
  // Ran out of data — count as scratch (close at last bar)
  const last = bars[bars.length - 1]!;
  return finishTrade(scenario, entryIdx, bars.length - 1, entryPrice, last.c, 0, bars.length - 1 - entryIdx);
}

function finishTrade(
  scenario: Scenario,
  entryIdx: number,
  exitIdx: number,
  entryPrice: number,
  exitPrice: number,
  targetRank: number,
  barsHeld: number,
): BacktestTrade {
  const isLong = scenario.direction === 'long';
  const risk = Math.abs(entryPrice - scenario.stopPrice);
  const pnl  = isLong ? (exitPrice - entryPrice) : (entryPrice - exitPrice);
  const r    = pnl / risk;
  return {
    scenarioId: scenario.id,
    signature: scenario.setupSignature,
    direction: scenario.direction,
    enteredAt: scenario.createdAt,
    exitedAt: Date.now(),                            // placeholder; tests use bars[exitIdx].t
    entryPrice,
    exitPrice,
    stopPrice: scenario.stopPrice,
    rMultiple: round(r, 4),
    ...(targetRank > 0 ? { targetHit: targetRank } : {}),
    barsHeld,
  };
}

// ----- Summary aggregation -------------------------------------------------
function summarize(trades: BacktestTrade[]): BacktestSummary {
  if (trades.length === 0) return emptySummary();
  const wins = trades.filter(t => t.rMultiple > 0);
  const losses = trades.filter(t => t.rMultiple <= 0);
  const grossWin  = wins.reduce((s, t) => s + t.rMultiple, 0);
  const grossLoss = Math.abs(losses.reduce((s, t) => s + t.rMultiple, 0));
  const avgR = trades.reduce((s, t) => s + t.rMultiple, 0) / trades.length;
  const winRate = wins.length / trades.length;
  const expectancyR = winRate * (wins.length ? grossWin / wins.length : 0) -
                      (1 - winRate) * (losses.length ? grossLoss / losses.length : 0);

  // Max drawdown in R-multiples
  let peak = 0, equity = 0, maxDd = 0;
  for (const t of trades) {
    equity += t.rMultiple;
    peak = Math.max(peak, equity);
    maxDd = Math.min(maxDd, equity - peak);
  }

  // By signature
  const sigGroups: Record<string, BacktestTrade[]> = {};
  for (const t of trades) (sigGroups[t.signature] ??= []).push(t);
  const bySignature: BacktestSummary['bySignature'] = {};
  for (const [sig, group] of Object.entries(sigGroups)) {
    const w = group.filter(g => g.rMultiple > 0).length;
    const a = group.reduce((s, g) => s + g.rMultiple, 0) / group.length;
    const wr = w / group.length;
    const losses2 = group.filter(g => g.rMultiple <= 0);
    const exp = wr * (w ? group.filter(g => g.rMultiple > 0).reduce((s, g) => s + g.rMultiple, 0) / w : 0) -
                (1 - wr) * (losses2.length ? Math.abs(losses2.reduce((s, g) => s + g.rMultiple, 0)) / losses2.length : 0);
    bySignature[sig] = { count: group.length, winRate: round(wr, 4), avgR: round(a, 4), expectancyR: round(exp, 4) };
  }

  return {
    trades,
    totalTrades: trades.length,
    wins: wins.length,
    losses: losses.length,
    winRate: round(winRate, 4),
    avgR: round(avgR, 4),
    expectancyR: round(expectancyR, 4),
    profitFactor: grossLoss === 0 ? Number.POSITIVE_INFINITY : round(grossWin / grossLoss, 4),
    maxDrawdownR: round(maxDd, 4),
    bySignature,
  };
}

function emptySummary(): BacktestSummary {
  return {
    trades: [], totalTrades: 0, wins: 0, losses: 0,
    winRate: 0, avgR: 0, expectancyR: 0, profitFactor: 0, maxDrawdownR: 0,
    bySignature: {},
  };
}

function round(x: number, p: number): number { const m = 10 ** p; return Math.round(x * m) / m; }
