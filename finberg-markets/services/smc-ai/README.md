# `@finberg/smc-ai` — FINBERG SMC AI Module

Institutional-grade Smart Money Concepts analysis engine for the FINBERG MARKETS platform.

## What it does

- Detects Market Structure, BOS / CHOCH / MSS, FVG, Order Blocks, Breaker Blocks, Liquidity Sweeps, Equal Highs/Lows, Premium/Discount + OTE, Internal/External Liquidity, PDH/PDL/PWH/PWL, Asia/London/NY session levels and patterns
- Computes a weighted HTF (D1+H4+H1) bias
- Composes explainable trading scenarios with entry zone, stop, ladder of TPs, RR, and confidence (with transparent breakdown)
- Backtests scenarios walk-forward and produces accuracy rollups per setup signature
- Upgrades the narrative + risk warning with Claude Opus 4.8 (optional)

See [`docs/smc/ARCHITECTURE.md`](../../docs/smc/ARCHITECTURE.md) for the full spec.

## Run

```bash
pnpm --filter @finberg/smc-ai dev
# listening on :4050
```

## HTTP API

| Method | Path | Body |
|---|---|---|
| POST | `/v1/smc/detect`   | `{ symbol, timeframe, bars }` |
| POST | `/v1/smc/analyze`  | `{ symbol, assetClass, bars, entryTimeframe, htfTimeframes, upgradeCommentary? }` |
| POST | `/v1/smc/backtest` | `{ symbol, assetClass, bars, entryTimeframe, htfTimeframes, startAtBar?, cooldownBars? }` |

## Test

```bash
pnpm --filter @finberg/smc-ai test
```
