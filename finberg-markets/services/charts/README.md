# `@finberg/charts` — Chart Layouts Service

Persists chart layouts, drawings, and per-pane indicator instances. Supports public sharing via signed slugs.

## Responsibilities
- CRUD chart layouts (`single`, `2v`, `2h`, `3`, `4`, `6`, `8` grids)
- Per-pane symbol/timeframe/theme persistence
- Drawing persistence (trendlines, fibs, channels, ...) with point geometry
- Indicator instance persistence (which built-in + user scripts are active)
- Public share slug generation + rate-limited rendering of preview images
- Versioning / undo history (last 25 snapshots)

## Interface
- HTTP: `GET/POST/PATCH/DELETE /layouts`, `POST /layouts/{id}/share`, `GET /layouts/share/{slug}`
- gRPC (internal): `GetLayout`, `CloneTemplate`

## Key Tables
`chart_layouts`, `drawings`, `indicator_instances`, `user_scripts`.
