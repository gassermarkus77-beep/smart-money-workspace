# `@finberg/watchlists` — Watchlists & Scanner Service

Owns watchlists, scanner queries, heatmaps, and sector dashboards.

## Responsibilities
- CRUD watchlists + items with positional ordering
- Run scanner queries (200+ filter fields) against ClickHouse
- Heatmap aggregation (sector / market cap / performance)
- Saved scanner presets (shareable on Pro)

## Interface
- HTTP: `GET/POST/DELETE /watchlists`, `POST /scanner/run`, `GET /heatmap/{kind}`
- Reads from: ClickHouse `bars_*` materialized views, `instruments` table

## Key Tables
`watchlists`, `watchlist_items`, plus ClickHouse analytics tables (`bars_1d_mv`, `quote_snapshots_mv`).
