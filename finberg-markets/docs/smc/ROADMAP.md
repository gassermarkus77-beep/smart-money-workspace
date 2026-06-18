# FINBERG SMC AI — Roadmap

## MVP (Weeks 0–6)

**Goal**: end-to-end SMC analysis on crypto + forex, single HTF (H1) drives a bias, LTF (M15) gives the trigger. Plain-text narrative, no LLM cost.

| Workstream | Deliverable |
|---|---|
| Detectors | Structure, BOS, CHOCH, FVG, OB, Liquidity sweeps, PDH/PDL, Asia H/L |
| Bias engine | Single TF (H1); trend voting |
| Scenario builder | Entry from OB or FVG; SL below sweep; TP ladder from PDH/PDL/PWH/PWL |
| API | `/v1/smc/detect`, `/v1/smc/analyze` |
| UI | SmcOverlay (chart rectangles + lines), ScenarioPanel, DetectionLegend |
| Persistence | `smc_detections` + `smc_scenarios` tables |
| Tests | Detector + bias + scenario builder Vitest suites |

**Team**: 1 quant, 1 backend, 1 frontend, 1 designer.
**Effort**: 30 dev-days. **Infra cost**: negligible (CPU-only).

## v1.0 (Weeks 6–14)

**Goal**: Full institutional-grade module across all asset classes.

| Workstream | Deliverable |
|---|---|
| Detectors | + MSS (post-sweep CHOCH), Breaker Blocks, EQH/EQL clustering, Premium/Discount + OTE, Internal/External Liquidity, PWH/PWL, London sweep + NY manipulation |
| Bias engine | Weighted vote across D1 + H4 + H1 with per-asset weights |
| Scenario builder | Multi-target ladder; per-asset min RR; confidence + breakdown |
| Backtester | Walk-forward replay, per-signature accuracy rollups |
| LLM upgrade | Claude Opus 4.8 narrative + risk warning (cached, budgeted) |
| Alerts | `notifications.dispatch` integration; per-user filters |
| UI | ConfidenceBreakdown, AccuracyWidget, BacktestReport pages |
| Persistence | `smc_backtest_*` + `smc_accuracy_rollup` |
| Calibration | Per-asset-class JSON in `config/calibration/` |

**Team**: +1 ML engineer, +1 frontend, +1 SRE.
**Effort**: 60 dev-days additional.
**Infra cost**: $300–800/mo (LLM-driven; capped per user tier).

## v2.0 (Weeks 14–28)

**Goal**: ML augmentation, multi-asset correlation, semi-automated paper trading.

| Workstream | Deliverable |
|---|---|
| ML detectors | CNN over candle images for OB validity; LSTM for FVG mitigation timing |
| Correlation overlay | DXY for FX, BTC dominance for alts, SPX vs sector |
| Order flow | Volume profile, footprint, delta integration when L2 data available |
| Auto-paper-trading | High-confidence scenarios entered in a virtual book; published win-rate |
| Custom presets | Users tune detector parameters (Pro+) |
| Marketplace | Community scripts that extend / replace bias + entry logic |
| Mobile | MSS push notifications in < 2s after candle close |

**Team**: +2 ML, +1 GPU SRE.
**Effort**: 120 dev-days.
**Infra cost**: $5–15K/mo (GPU inference pool).

## Anti-goals (explicit)

- ❌ "Auto-trade" via real broker without explicit per-trade user confirmation
- ❌ Implying guaranteed profit or signal accuracy
- ❌ Hidden detector parameters — every threshold is in `config/calibration/` and visible to users
- ❌ Blocking the chart render on LLM calls — narrative upgrade is async, with fallback
