# FINBERG SMC AI — Architecture & Specification

> Institutional-grade Smart Money Concepts analysis engine for FINBERG MARKETS.
> Detects market structure, generates scenarios, backtests them, and emits alerts.

---

## 1. Mission

Replace the typical retail "SMC indicator" with an analytical engine an institutional desk would actually use:

- **Deterministic, auditable detection** for every concept (no black-box CNNs in v1)
- **Multi-timeframe HTF→LTF orchestration** that mirrors ICT methodology
- **Explainable scenarios** — every recommendation cites the levels and events that produced it
- **Backtested confidence** — historical accuracy of similar setups attached to every scenario
- **No "guaranteed profit"** language; explicit risk warnings on every output

---

## 2. Concepts Detected (v1)

| Concept | Code | Output type |
|---|---|---|
| Market Structure | `MS`           | swings + state (bullish/bearish/neutral) per TF |
| Break of Structure | `BOS`        | direction, broken swing price + time |
| Change of Character | `CHOCH`     | direction, flip point |
| Market Structure Shift | `MSS`    | strict CHOCH after liquidity sweep |
| Fair Value Gap | `FVG`            | top, bottom, direction, mitigation % |
| Order Block | `OB`               | top, bottom, direction, validity |
| Breaker Block | `BB`             | failed OB inverted into S/R |
| Liquidity Sweep | `LIQ_SWEEP`    | side, swept level, return |
| Equal Highs | `EQH`               | cluster of swings within tolerance |
| Equal Lows | `EQL`                | cluster of swings within tolerance |
| Premium / Discount | `PD_ZONE`    | range midline + OTE 0.62–0.79 |
| Internal Liquidity | `LIQ_INT`    | minor swings inside the range |
| External Liquidity | `LIQ_EXT`    | swing extremes of the range |
| Previous Day High/Low | `PDH/PDL` | daily anchor |
| Previous Week High/Low | `PWH/PWL` | weekly anchor |
| Asia Session H/L | `ASIA_H/L`     | session-bounded |
| London Sweep | `LDN_SWEEP`       | sweep + reaction in London KZ |
| New York Manipulation | `NY_MANIP` | NYAM stop-run pattern |

All detections are typed events (`SmcEvent`) with consistent fields: `kind`, `symbol`, `timeframe`, `time`, `payload`.

---

## 3. Pipeline

```
Bars (TF n)
    │
    ▼  Normalizer (ensure sorted, gap-fill)
Bars[]
    │
    ├──▶ Multi-TF aggregator ──▶ Bars[D1], Bars[H4], Bars[H1], Bars[M15], Bars[M5], Bars[M1]
    │
    ▼
For each TF in parallel:
    Structure swings  ──▶ BOS / CHOCH / MSS
                       └─▶ Internal / External liquidity
    FVG scanner       ──▶ FVGs with mitigation %
    OB scanner        ──▶ Order Blocks
    Breaker scanner   ──▶ Breaker Blocks
    Sweep scanner     ──▶ Liquidity sweeps + EQH/EQL clusters
    PD zone           ──▶ Premium / Discount + OTE
    Session anchors   ──▶ PDH/PDL, PWH/PWL, Asia/London/NY levels
    │
    ▼  Aggregate per symbol
SMC State
    │
    ▼  Bias Engine (D1+H4+H1 weighted vote)
HTF Bias
    │
    ▼  Scenario Builder
       1. HTF bias selects direction
       2. LTF (M15/M5/M1) MSS/CHOCH confirms intent
       3. Entry: best OB / FVG inside HTF discount (for longs) / premium (for shorts)
       4. SL: below swept liquidity / OB low
       5. TPs: internal liq → external liq → opposite extreme
       6. RR computed; setups under min RR pruned
    │
    ▼  Commentary (LLM)
Natural-language narrative + risk warning
    │
    ├──▶ Persisted to smc_scenarios
    └──▶ Emitted to alerts service
```

---

## 4. Backtesting

### Method
Walk-forward, bar-by-bar replay. For each generated scenario:

1. Replay the chart from the bar at which the scenario was emitted
2. Track which target/SL is hit first; record R-multiple
3. Aggregate by (symbol, asset class, timeframe, setup signature)

### Metrics
- Win rate
- Average R-multiple (positive expectancy required)
- Profit factor (gross win / gross loss)
- Max consecutive losses
- Avg time-in-trade
- Per-setup-signature breakdown (so users see which patterns work where)

### Output
Persisted to `smc_backtest_runs` + `smc_backtest_trades`; rolled up nightly into `smc_accuracy` for live-score display.

---

## 5. Confidence Score

A scenario's `confidence` ∈ [0, 1] is a transparent weighted sum:

```
confidence =
   0.35 * htf_bias_strength          // HTF agreement (D1/H4/H1)
 + 0.25 * historical_accuracy        // win-rate of the setup signature
 + 0.15 * sweep_quality              // sweep depth + return speed
 + 0.10 * confluence_count           // FVG ∪ OB ∪ PD ∪ session
 + 0.10 * rr_quality                 // RR > 3 boosts
 + 0.05 * volume_confirmation        // volume profile / delta confirmation
```

Each term is bounded [0,1]. The breakdown is returned to the UI so users see *why* the confidence is what it is.

---

## 6. Asset Coverage

The detection algorithms are price-agnostic: anything with OHLCV bars works. Calibration parameters per asset class (`config/calibration/*.json`) tune:

- ATR window for sweep depth
- Equal-highs tolerance (pips vs bps vs ticks)
- Session timezone & windows
- Min RR floor

Defaults provided for **forex**, **crypto**, **indices**, **commodities**, **stocks**.

---

## 7. Components

```
services/smc-ai/
├── src/
│   ├── pipeline/         # candle ingestion, normalization, MTF aggregation
│   ├── detectors/        # one module per concept
│   ├── scenario/         # bias engine, scenario builder, LLM commentary
│   ├── backtest/         # walk-forward engine, metrics, persistence
│   ├── alerts/           # detection → alert mapper
│   ├── api/              # HTTP endpoints
│   ├── prompts/          # Anthropic prompt templates
│   └── main.ts
├── tests/
└── package.json
```

```
packages/ui/src/smc/
├── SmcOverlay.tsx          # render detections on chart
├── ScenarioPanel.tsx       # narrative + entry/SL/TP card
├── DetectionLegend.tsx
├── ConfidenceBreakdown.tsx
├── AccuracyWidget.tsx
└── BacktestReport.tsx
```

---

## 8. Database

See `database/schemas/smc.sql`. Five tables:

- `smc_detections`        — every event the detectors emit
- `smc_scenarios`         — composed trading scenarios
- `smc_scenario_targets`  — one row per take-profit level
- `smc_backtest_runs`     — historical performance evaluations
- `smc_backtest_trades`   — individual simulated trades
- `smc_accuracy_rollup`   — nightly per-signature rollup

---

## 9. API Surface

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/smc/analyze`   | Run full pipeline on bars, return state + scenarios |
| POST | `/v1/smc/detect`    | Run just the detectors, return events |
| GET  | `/v1/smc/scenarios` | List recent scenarios with filters |
| POST | `/v1/smc/backtest`  | Kick off a backtest run |
| GET  | `/v1/smc/backtest/{id}` | Get run results |
| GET  | `/v1/smc/accuracy`  | Historical accuracy per signature |

---

## 10. Roadmap

### MVP (4–6 weeks)
- Detectors: structure, BOS, CHOCH, FVG, OB, sweeps, PDH/PDL, Asia H/L
- Single-TF bias (HTF=H1)
- Scenario builder + plain-text narrative (no LLM)
- API: `/analyze`, `/detect`
- Chart overlay component
- Crypto + Forex coverage

### v1.0 (8–10 weeks)
- Full detector set (incl. Breakers, MSS, EQH/EQL, PWH/PWL, Premium/Discount)
- Multi-TF bias engine (D1+H4+H1 weighted)
- LLM-powered commentary (Claude Opus 4.8 stream)
- Backtester (walk-forward) + accuracy rollup
- Confidence score with breakdown
- Stocks, Indices, Commodities calibrations
- Alerts integration

### v2.0 (16+ weeks)
- ML-augmented detectors (CNN on candle images for OB validity; LSTM for FVG mitigation timing)
- Multi-asset correlation overlay (DXY for FX, BTC dominance for alts, etc.)
- Order-flow integration (volume delta, footprint) when available
- Strategy marketplace (community-tunable detector parameters)
- Auto-paper-trading of high-confidence scenarios
- Mobile push of MSS events in real time
