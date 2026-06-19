# `@finberg/indicators` — Indicators Service

Compiles FinScript, runs scripts server-side for backtests / scanner queries / alerts, and serves the public indicator marketplace.

## Responsibilities
- Compile/validate FinScript via `@finberg/finscript` compiler
- Persist script versions
- Sandbox execution in `isolated-vm` workers (CPU + memory caps)
- Marketplace: publish, install, rate, revenue share (80/20)
- Per-bar evaluation for scanner queries (vectorized when possible)

## Interface
- HTTP: `POST /scripts`, `GET /scripts/{id}`, `POST /scripts/{id}/compile`, `POST /scripts/{id}/run`, `GET /marketplace/scripts`
- gRPC (internal): `EvaluateForBars`, `EvaluateForTick`

## Tech
NestJS + `@finberg/finscript` + `isolated-vm`.
