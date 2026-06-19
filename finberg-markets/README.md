# FINBERG MARKETS

> Cloud-native, AI-augmented trading & market intelligence platform.

A white-label, institutional-grade analytical workspace built to rival TradingView in capability while serving retail traders, hedge funds, wealth managers, and analysts.

**Full enterprise spec**: [`BLUEPRINT.md`](./BLUEPRINT.md)

---

## Monorepo Layout

| Path | Purpose |
|---|---|
| `apps/web` | Next.js 15 main web app (charts, social, account) |
| `apps/mobile` | React Native + Expo (iOS + Android) |
| `apps/admin` | Next.js admin console |
| `services/api-gateway` | NestJS edge gateway |
| `services/auth` | OAuth, 2FA, JWT |
| `services/users` | Profiles, prefs, RBAC |
| `services/market-data` | Multi-vendor router + Go hot path |
| `services/charts` | Chart layout persistence + sharing |
| `services/indicators` | Built-in + FinScript runtime |
| `services/watchlists` | Lists, scanners, heatmaps |
| `services/alerts` | Per-tick evaluator + dispatcher |
| `services/notifications` | Multi-channel sender (email/push/Telegram/webhook) |
| `services/ai-engine` | Claude-powered analysis + ONNX SMC detectors |
| `services/payments` | Stripe + PayPal + crypto |
| `services/social` | Ideas, follow, DMs, moderation |
| `packages/shared` | Shared TS types, Zod schemas, constants |
| `packages/ui` | shadcn/ui-based component library |
| `packages/finscript` | Pine-Script-class DSL compiler + runtime |
| `infrastructure/docker` | Local dev `docker-compose` |
| `infrastructure/kubernetes` | Helm charts |
| `infrastructure/terraform` | AWS infrastructure as code |
| `infrastructure/github-actions` | Reusable CI/CD workflows |
| `database/schemas` | Reference SQL per domain |

---

## Quick Start (Local Dev)

```bash
# Prereqs: Node 20+, pnpm 9+, Docker 24+
pnpm install

# Start infrastructure (Postgres, Timescale, Redis, Kafka, NATS, MinIO)
pnpm dev:infra

# Run all services + web in parallel
pnpm dev

# Open
# - Web:   http://localhost:3000
# - Admin: http://localhost:3001
# - API:   http://localhost:4000/docs
```

---

## Tech Stack Cheat Sheet

- **Frontend**: Next.js 15, React 19, TypeScript 5.5, Tailwind 4, Zustand, TanStack Query
- **Charts**: Custom Canvas2D/WebGL engine (`@finberg/chart-engine`)
- **Backend**: NestJS 10 + Fastify; Go 1.23 (tick fan-out); Rust (order book)
- **Data**: PostgreSQL 16 (Aurora) + TimescaleDB + Redis Cluster + ClickHouse
- **Streaming**: Kafka (MSK) + NATS JetStream
- **Auth**: Keycloak + OAuth 2.1 + WebAuthn
- **Infra**: AWS · EKS · Terraform · Helm · ArgoCD · Istio
- **Observability**: Prometheus + Grafana + Loki + Tempo + OpenTelemetry
- **CI/CD**: GitHub Actions + Turborepo + ECR + ArgoCD

---

## Status

Pre-MVP scaffolding — see `BLUEPRINT.md` § Phase 10 for the full roadmap.
