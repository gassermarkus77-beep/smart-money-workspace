# Service Level Objectives — FINBERG MARKETS

Targets are user-facing, measured at the edge unless noted.

## Web app

| SLI | SLO | Window | Burn alert |
|---|---|---|---|
| Time to first chart paint (p75) | < 2.5s | rolling 28d | > 5x in 1h |
| Chart pan/zoom frame time (p99) | < 16ms | 7d | > 5x in 1h |
| API 2xx rate | > 99.9% | 28d | error budget: 0.1% |
| WebSocket disconnect rate | < 0.5% / 5m / user | 7d | spikes alarmed |

## API gateway

| SLI | SLO |
|---|---|
| Availability | 99.95% / month |
| Latency p99 | < 200ms (non-streaming) |
| Latency p999 | < 1s |

## Market data WebSocket

| SLI | SLO |
|---|---|
| Tick-to-client end-to-end (p99) | < 80 ms (intra-region) |
| Symbol-subscribe RTT | < 50 ms |
| Reconnect success | > 99% within 5s |

## Alerts

| SLI | SLO |
|---|---|
| Trigger-to-dispatch | < 1s p99 |
| Dispatch success | > 99.5% |

## AI engine

| SLI | SLO |
|---|---|
| Analyze stream first-token (p75) | < 800ms |
| Detector batch (200 bars) | < 250ms p99 |

## Error budgets
Each SLO carries an explicit budget; consume → freeze risky deploys; restore → resume. Burn-rate alerts at 2x, 5x, 10x.

## Tooling
- Prometheus + Grafana SLO dashboards
- Alertmanager → PagerDuty (severity by burn-rate)
- Quarterly SLO review with product
