# FINBERG MARKETS — Enterprise Technical Blueprint

> **Cloud-Based Institutional-Grade Trading & Market Analysis Platform**
> Version 1.0 — Production Specification
> Audience: Engineering team, CTO, product, investors

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Phase 1: System Architecture](#phase-1-system-architecture)
3. [Phase 2: Technology Stack](#phase-2-technology-stack)
4. [Phase 3: Core Features](#phase-3-core-features)
5. [Phase 4: AI Features](#phase-4-ai-features)
6. [Phase 5: User Management & Billing](#phase-5-user-management--billing)
7. [Phase 6: Social Network](#phase-6-social-network)
8. [Phase 7: Mobile Application](#phase-7-mobile-application)
9. [Phase 8: Security & Compliance](#phase-8-security--compliance)
10. [Phase 9: Admin Panel](#phase-9-admin-panel)
11. [Phase 10: Development Roadmap](#phase-10-development-roadmap)
12. [Phase 11: Source Code Structure](#phase-11-source-code-structure)
13. [Phase 12: Business Model & Financials](#phase-12-business-model--financials)
14. [Appendices](#appendices)

---

## 1. Executive Summary

**FINBERG MARKETS** is a white-label, cloud-native trading and market intelligence platform designed to rival TradingView in capability while serving retail traders, hedge funds, wealth managers, and institutional analysts.

### Vision
The world's most performant, AI-augmented charting and decision-support workspace for global markets — from a single browser tab or mobile device.

### Key Differentiators
- **Microsecond-grade WebSocket streaming** across stocks, FX, crypto, indices, commodities, and bonds
- **FinScript**: a proprietary indicator scripting language (Pine-Script-class but ES-module compatible)
- **Built-in Smart Money / ICT detection AI** (FVG, Order Blocks, BOS, CHOCH, Liquidity Sweeps)
- **Institutional tier** with multi-seat SSO, audit trails, MiFID II/MiCA compliance
- **Open broker layer** with FIX 5.0 + REST gateway (Phase 3)

### Headline Numbers
| Metric | MVP | v1.0 | v2.0 | v3.0 |
|---|---|---|---|---|
| Markets | Crypto + US Equities | + FX, Indices | + Commodities, Bonds | Global multi-asset |
| Concurrent users | 1,000 | 25,000 | 250,000 | 1,000,000+ |
| Indicators | 20 built-in | 80 + scripting | 150 + AI | Full library |
| Time to ship | 4 months | 9 months | 18 months | 30 months |
| Team size | 8 | 22 | 45 | 80 |
| Budget (cumulative) | $480K | $2.2M | $6.8M | $18M |

---

# PHASE 1: SYSTEM ARCHITECTURE

## 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              CLIENTS                                     │
│   Web (Next.js)    iOS (RN)    Android (RN)    Admin (Next.js)           │
└──────────────┬──────────────────────────────────────────────────────────┘
               │ HTTPS / WSS
┌──────────────▼──────────────────────────────────────────────────────────┐
│                          EDGE LAYER                                     │
│   Cloudflare (CDN, WAF, DDoS, Bot mgmt) → AWS Route53 → ALB             │
└──────────────┬──────────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────────┐
│                        API GATEWAY (NestJS + Fastify)                   │
│   AuthN/AuthZ • Rate limiting • Request shaping • Schema validation     │
└──────────┬──────────────────────────────────────────────┬───────────────┘
           │ gRPC / NATS                                  │ WebSocket Multiplexer
           │                                              │
┌──────────▼─────────────────────────────────────────────▼────────────────┐
│                       MICROSERVICES (NestJS)                            │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐    │
│  │ Auth    │ │ Users    │ │ Charts   │ │ Indicators │ │ Watchlists │    │
│  └─────────┘ └──────────┘ └──────────┘ └────────────┘ └────────────┘    │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌────────────┐    │
│  │ Alerts  │ │ AI Engine│ │ Notify   │ │ Payments   │ │ Social     │    │
│  └─────────┘ └──────────┘ └──────────┘ └────────────┘ └────────────┘    │
│  ┌──────────────────────────────────────────────────────────────────┐   │
│  │           MARKET DATA SERVICE (Go + Rust hot-path)                │   │
│  │  Polygon │ Twelve Data │ Binance │ Finnhub │ TradingEconomics    │   │
│  └──────────────────────────────────────────────────────────────────┘   │
└─────────┬────────────────────────────────────────────────┬──────────────┘
          │                                                │
┌─────────▼──────────────┐  ┌──────────────────────┐  ┌────▼──────────────┐
│      DATA PLANE        │  │   STREAMING SPINE    │  │  OBJECT STORE     │
│ PostgreSQL 16 (Aurora) │  │  Kafka (MSK)         │  │  S3 (chart snaps) │
│ TimescaleDB (OHLCV)    │  │  NATS JetStream      │  │  CloudFront edges │
│ Redis Cluster (cache)  │  │  Redis Streams       │  │                   │
│ ClickHouse (analytics) │  │                      │  │                   │
└────────────────────────┘  └──────────────────────┘  └───────────────────┘
```

## 1.2 Component Responsibilities

### 1.2.1 Frontend
| Concern | Choice | Why |
|---|---|---|
| Framework | **Next.js 15** (App Router, RSC) | Hybrid SSR/SSG, edge runtime, SEO for public pages |
| Language | **TypeScript 5.5+** | Type safety across 80% of stack |
| Styling | **Tailwind CSS 4** + Radix UI | Utility-first; design-system speed |
| Charts | **Custom canvas/WebGL engine** + Lightweight Charts fallback | TV-class perf is not achievable with React-only |
| State | **Zustand** + **TanStack Query** | Tiny global state + server cache |
| Realtime | **Socket.IO + binary CBOR** | Sub-50ms tick delivery |

### 1.2.2 Backend
| Concern | Choice | Why |
|---|---|---|
| Gateway | **NestJS + Fastify** | DI, modules, OpenAPI auto-gen |
| Hot path (ticks) | **Go 1.23 service** + **Rust orderbook builder** | µs-level latency for trade feeds |
| Internal RPC | **gRPC** (proto3) | Schema-versioned, bidi-stream |
| Async / events | **Kafka (MSK)** + **NATS JetStream** | Tick fan-out + work queues |

### 1.2.3 Database
| Store | Use | Why |
|---|---|---|
| **PostgreSQL 16** (Aurora) | Transactional (users, billing, layouts) | Battle-tested OLTP, JSONB for flex schemas |
| **TimescaleDB** | OHLCV bars, tick archive | Hypertables, compression, continuous aggregates |
| **Redis Cluster** | Hot quotes, session, rate-limit | Sub-ms latency |
| **ClickHouse** | Analytics, scanner, heatmaps | Columnar, billions of rows per second |
| **S3 + CloudFront** | Chart snapshots, exports, replays | Cheap durable storage |

### 1.2.4 Authentication
- **Keycloak** (or Auth0 for v0) as identity broker
- OAuth 2.1 / OpenID Connect (Google, Apple, Microsoft, GitHub)
- **TOTP-based 2FA** + WebAuthn (passkeys) + recovery codes
- JWT (RS256) with short-lived access (5m) + rotating refresh (30d)
- Session revocation via Redis denylist

### 1.2.5 Chart Engine
A standalone TypeScript package `@finberg/chart-engine` with:
- **Canvas2D primary renderer**, **WebGL2 fallback** for >100k bars
- 60 FPS pan/zoom under 250k visible candles
- Plugin system for indicators, overlays, drawing tools
- Independent of React (works in any DOM context)
- Replay engine for backtesting visualizations

### 1.2.6 Market Data Engine
- Multi-vendor abstraction with cost-based router
- Normalizer translating each vendor's payload to canonical `Tick`, `Bar`, `OrderBook`, `Trade` schemas
- L1 + L2 quotes; WebSocket multiplexer holds one upstream conn per (provider, asset class) and fans out to N clients
- Backfill workers paginate historical bars into TimescaleDB

### 1.2.7 Notification System
- **Channels**: in-app, email (SES), push (FCM/APNS), Telegram, Slack, Discord, Webhook
- **Engine**: NATS-driven, with idempotency keys + exponential backoff
- **Templates**: MJML for email, JSON schema for push

### 1.2.8 AI Engine
- **LLM backbone**: Claude Opus 4.8 (`claude-opus-4-8`) for analysis prose; Haiku 4.5 (`claude-haiku-4-5-20251001`) for low-latency labelling
- **Vision**: Claude vision on chart snapshots for pattern recognition
- **Custom models**: PyTorch ONNX-exported detectors for Order Blocks, FVG, BOS, CHOCH running on GPU inference pool
- Streaming responses via SSE

### 1.2.9 Payment System
- **Stripe Billing** (subscriptions, metered usage, invoices, tax via Stripe Tax)
- **PayPal** (alternative)
- **NOWPayments** or **Coinbase Commerce** for crypto (BTC, ETH, USDC, USDT)
- Dunning, proration, seat-based billing for institutional

### 1.2.10 Admin Panel
Standalone Next.js app under `admin.finberg.markets` with:
- User management, impersonation
- Subscription lifecycle
- Manual KYC review
- Live system health (Grafana embed)
- Feature flag console (Unleash)
- Audit log explorer

### 1.2.11 Mobile Application
- **React Native 0.76 (New Architecture)** + Expo SDK 52
- Native chart engine via Skia / `react-native-skia`
- Push notifications via Firebase Messaging + APNs
- Biometric auth (Face ID / fingerprint)

## 1.3 Multi-Region & DR
- Primary: **eu-central-1 (Frankfurt)** (EU data residency)
- Secondary: **us-east-1 (N. Virginia)** (low-latency US data feeds)
- Aurora Global Database for cross-region replication
- RPO ≤ 5 minutes, RTO ≤ 15 minutes

---

# PHASE 2: TECHNOLOGY STACK

## 2.1 Frontend Stack
| Layer | Technology | Version | Justification |
|---|---|---|---|
| Framework | Next.js | 15.x | App Router, RSC, edge runtime, ISR for marketing/news pages |
| Language | TypeScript | 5.5+ | End-to-end type safety; shared types via `@finberg/shared` |
| UI library | React | 19 | Concurrent rendering, Suspense for streaming UIs |
| Styling | Tailwind CSS | 4.x | Design-system velocity, JIT, dark/light themes |
| Components | Radix UI + shadcn/ui | latest | Accessible primitives; full design control |
| Charts | Custom canvas/WebGL engine | in-house | TV-class performance impossible with pure React |
| State (client) | Zustand | 4.x | Tiny (1.4kB), no boilerplate |
| State (server) | TanStack Query | 5.x | Cache, refetch, optimistic mutations |
| Realtime | Socket.IO client (binary CBOR) | 4.x | Auto-reconnect, namespacing |
| Forms | React Hook Form + Zod | latest | Performance + schema-first validation |
| Testing | Vitest, Playwright | latest | Fast unit + true E2E |
| Build | Turbopack (Next 15) | — | 10× faster than Webpack |

## 2.2 Backend Stack
| Layer | Technology | Justification |
|---|---|---|
| Gateway / services | **NestJS 10 + Fastify 4** | Modular DI, OpenAPI, microservice transports built-in |
| Hot tick path | **Go 1.23** | GC tuned, goroutines, single-binary deployable |
| Order book / matching simulator | **Rust** (Axum + Tokio) | Lock-free, deterministic latency |
| ORM | **Prisma 5** for OLTP; **Drizzle** for TimescaleDB raw SQL | Type-safe + raw-SQL flexibility |
| Validation | **Zod** (TS) / **validator** (Go) | Edge-to-DB schemas |
| Background jobs | **BullMQ** (Redis) | Reliable retries, cron, rate-limited queues |

## 2.3 Database Stack
| Store | Version | Role |
|---|---|---|
| PostgreSQL (Aurora) | 16 | OLTP transactional store |
| TimescaleDB | 2.16 | OHLCV time series (hypertables, continuous aggregates) |
| Redis | 7.4 (Cluster mode) | Cache, sessions, pub/sub |
| ClickHouse | 24.x | Analytics, scanner, heatmaps, audit |
| S3 | — | Chart snapshots, CSV/PDF exports, backups |

## 2.4 Infrastructure
| Concern | Technology | Notes |
|---|---|---|
| Container | **Docker** | Multi-stage, distroless base for size + CVE surface |
| Orchestration | **Kubernetes (EKS)** | HPA, PDB, blue/green, ArgoCD GitOps |
| Cloud | **AWS** (multi-AZ, multi-region) | MSK, Aurora, ElastiCache, S3, CloudFront, SES, SNS |
| IaC | **Terraform 1.9** + **Helm 3** | Reproducible infra; chart-based services |
| Service mesh | **Istio 1.23** | mTLS, traffic shaping, circuit breakers |
| Secrets | **AWS Secrets Manager** + **External Secrets Operator** | Rotated, scoped per service |
| CDN / WAF | **Cloudflare** | DDoS, bot management, edge cache |

## 2.5 Authentication
| Capability | Technology |
|---|---|
| Identity broker | **Keycloak 25** (or Auth0 for MVP) |
| OAuth providers | Google, Apple, Microsoft, GitHub, LinkedIn |
| Standards | OAuth 2.1, OpenID Connect, SAML 2.0 (institutional SSO) |
| MFA | **TOTP** (RFC 6238), **WebAuthn / passkeys**, SMS fallback |
| Tokens | **JWT RS256** — 5min access, 30d refresh, rotating |
| Session storage | Redis denylist for revocation |

## 2.6 Real-Time Data
| Component | Choice | Rationale |
|---|---|---|
| Client transport | **Socket.IO** over WSS, binary CBOR frames | Auto-reconnect, namespacing |
| Server multiplexer | Go fan-out service | One upstream feed per (vendor, asset) → N clients |
| Event bus | **Kafka (MSK)** | Tick fan-out, replay, durable |
| Work queues | **NATS JetStream** | Lightweight, ms-level alert routing |
| Cache layer | **Redis Streams** | Hot quotes, fast scanner reads |

## 2.7 Monitoring & Observability
| Concern | Stack |
|---|---|
| Metrics | **Prometheus** + **Grafana** |
| Logs | **Loki** + **Promtail** (structured JSON) |
| Traces | **OpenTelemetry** → **Tempo** |
| APM | **Grafana k6** (load), **Sentry** (errors) |
| SLO/SLI | Burn-rate alerts via Alertmanager → PagerDuty |
| Synthetic | Pingdom + custom Playwright runners |

## 2.8 CI/CD
| Stage | Tool |
|---|---|
| Source | **GitHub** (monorepo, branch protection) |
| CI | **GitHub Actions** (matrix per service) |
| Build | **Turborepo** (cached, remote cache via S3) |
| Container registry | **Amazon ECR** |
| Delivery | **ArgoCD** (GitOps, sync waves per environment) |
| Quality gates | ESLint, Prettier, SonarCloud, Trivy (image CVE), Semgrep (SAST), Snyk (deps) |

---

# PHASE 3: CORE FEATURES

## 3.1 Market Data

### Supported Asset Classes
| Asset class | Coverage | Primary provider | Fallback |
|---|---|---|---|
| **Stocks** (US, EU, APAC) | 50+ exchanges | Polygon.io | Finnhub, Alpha Vantage |
| **Forex** | 80 majors/minors/exotics | Twelve Data | OANDA REST |
| **Crypto** | 1,500+ pairs | Binance, Coinbase, Kraken | CoinGecko |
| **Indices** | 200+ globally | Polygon, Finnhub | Trading Economics |
| **Commodities** | Gold, Silver, Oil, Gas, Wheat | Twelve Data | TE |
| **Bonds & Yields** | US/EU/UK/JP curves | Trading Economics | Finnhub |

### Provider Comparison

| Provider | Asset coverage | Realtime cost (Pro)* | WebSocket | Historical bars | Strengths | Weaknesses |
|---|---|---|---|---|---|---|
| **Polygon.io** | US equities, options, FX, crypto | $199–$1,999/mo | ✅ | 20y | Tick-level, low latency | US-centric |
| **Twelve Data** | Global stocks, FX, crypto, commodities | $79–$1,499/mo | ✅ | 20y | Best price/global coverage | Slightly fewer ticks |
| **Alpha Vantage** | Stocks, FX, crypto | Free/$50–$250 | ❌ (REST only) | 20y | Cheap baseline | Rate-limited, REST-only |
| **Binance API** | Crypto | Free | ✅ | 5y | Best crypto book depth | Crypto only |
| **CoinGecko** | Crypto fundamentals | Free–$799/mo | ❌ | 10y | Market cap, on-chain | No L2 |
| **Finnhub** | Global stocks, news, alt data | $99–$999/mo | ✅ | 30y | Strong news + fundamentals | Spotty intraday |
| **Trading Economics** | Macro, bonds, calendar | $79–$2,500/mo | partial | 30y | Macro coverage | Slower realtime |

\* Indicative — negotiate enterprise.

### Recommended Mix (MVP → Scale)
- **MVP**: Binance (free, crypto) + Polygon Starter ($199) + Alpha Vantage free tier ⇒ ~$220/mo
- **v1.0**: Polygon Advanced ($1,999) + Twelve Data Pro ($799) + Finnhub Enterprise ($499) ⇒ ~$3,300/mo
- **v2.0+**: Direct exchange feeds (NYSE TAQ, CME, EUREX) via colo ⇒ $50K–$200K/mo

## 3.2 Charting Engine

### Chart Types
Candlestick · Line · Area · Bar (OHLC) · Heikin Ashi · Renko · Kagi · Point & Figure · Range bars · Volume candles

### Timeframes
Tick · 1s · 5s · 15s · 30s · 1m · 3m · 5m · 15m · 30m · 1H · 2H · 4H · 1D · 3D · 1W · 1M · 3M · 1Y

### Interaction Features
- **Pan/Zoom**: pointer drag, wheel, pinch (touch); inertial scrolling on mobile
- **Crosshair**: synced across linked panes; OHLCV tooltip with delta vs prev bar
- **Multi-chart layouts**: 1, 2, 3, 4, 6, 8-panel grids; per-pane symbol & timeframe
- **Drawing tools** (60+): trendlines, horizontal/vertical lines, channels, parallel channels, Fibonacci (retracement, extension, fan, time zones, arcs), Gann fan/box, pitchfork, Elliott waves, ABCD pattern, head & shoulders, triangles, rectangles, ellipses, brushes, arrows, text/notes, callout, price label, image upload
- **Snap to candle / OHLC / indicator value**
- **Magnet mode**
- **Bar replay** (rewind, step, play 1×/5×/30×)

### Architecture (`@finberg/chart-engine`)
```
ChartEngine
├── Renderer (Canvas2D / WebGL2 switch by N candles)
├── Scene
│   ├── PriceAxis  TimeAxis  Grid  Crosshair
│   ├── Series (Candle, Line, Histogram, Heatmap)
│   ├── Indicator panes (MA, RSI, MACD, …)
│   └── Drawings (selectable, hit-tested)
├── DataSource (push/pull adapter)
├── Plugin API (register series / drawing / indicator)
└── EventBus (zoom, hover, draw-complete)
```

## 3.3 Indicators

### Built-in (40+ at MVP)
**Trend**: SMA, EMA, WMA, HMA, DEMA, TEMA, Ichimoku, SuperTrend, Parabolic SAR
**Momentum**: RSI, MACD, Stochastic, CCI, Williams %R, Awesome Oscillator
**Volatility**: Bollinger Bands, ATR, Keltner Channels, Donchian Channels
**Volume**: Volume, VWAP, OBV, MFI, Volume Profile, Chaikin Money Flow
**Smart Money**: Order Blocks (auto), FVG, Liquidity Pools, BOS/CHOCH (Phase 4 AI)

### FinScript — Custom Indicator Language
Pine-Script-class DSL, transpiled to ES2022. Sandboxed in a Web Worker.

```finscript
//@version=1
indicator("Triple EMA Cross", overlay=true)

length1 = input.int(9, "Fast")
length2 = input.int(21, "Medium")
length3 = input.int(50, "Slow")

ema1 = ta.ema(close, length1)
ema2 = ta.ema(close, length2)
ema3 = ta.ema(close, length3)

plot(ema1, "Fast", color=color.blue)
plot(ema2, "Medium", color=color.orange)
plot(ema3, "Slow", color=color.red)

bullish = ta.crossover(ema1, ema2) and ema2 > ema3
alertcondition(bullish, "Triple EMA Bullish", "Fast crossed up Medium above Slow")
```

Language built-ins:
- `ta.*` — technical analysis (ema, sma, rsi, macd, atr, crossover, crossunder, highest, lowest)
- `math.*` — math primitives
- `input.*` — typed user inputs
- `plot/plotshape/fill/hline`
- `alert/alertcondition`
- `strategy.*` (Phase 4) — backtesting primitives

Compiler pipeline: **Lexer → Parser → AST → Validator → ES2022 transpile → Worker runtime**. See `packages/finscript/` for reference implementation.

## 3.4 Watchlists & Scanners
- Multiple lists per user (free: 2 lists × 20 syms; pro: unlimited)
- Drag-drop reorder, sectors, custom columns
- **Market Scanner**: 200+ filter fields (price, volume, market cap, RSI, MACD signal, gap %, relative volume, news sentiment, options IV)
- **Heatmaps**: by market cap × % change, sector treemap, performance matrix
- **Sector dashboards** with leaders/laggards
- Shareable scanner presets (Pro)

## 3.5 Alerts
| Type | Trigger | Channels |
|---|---|---|
| Price | crosses / above / below / channel break | in-app, email, push, Telegram, webhook |
| Volume | absolute / relative spike | all |
| Indicator | series cross, value compare | all |
| Drawing | line break, FVG mitigation | all |
| News | keyword in headlines (FuzzyKW + LLM intent) | all |
| AI pattern | OB created, BOS, liquidity sweep | all |

Engine: per-tick evaluator in Go (NATS subject `alerts.eval.{symbol}`), idempotent dispatch via outbox pattern.

---

# PHASE 4: AI FEATURES

## 4.1 Market Analysis AI
- **On-demand commentary**: user clicks "Analyze" on a chart → snapshot + last 500 bars + indicators → Claude Opus 4.8 produces structured JSON commentary (`bias`, `key_levels`, `narrative`, `risks`).
- **Daily market briefings**: per asset class, generated nightly via cron, served on dashboard.
- **News summarization**: incoming headlines run through Haiku 4.5 → sentiment (-1..1) + entities + 1-line summary.

## 4.2 Smart Money / ICT Detection
Detectors run in Python (PyTorch → ONNX → CPU/GPU inference pool).

| Detector | Approach | Output |
|---|---|---|
| **Fair Value Gap (FVG)** | Rule-based + LSTM mitigation predictor | Up/down FVG zones with mitigation probability |
| **Order Blocks (OB)** | CNN over candle images + impulsive-move heuristic | Bullish/bearish OB rectangles |
| **Liquidity Sweeps** | Swing high/low scanner + wick rejection model | Marked sweep events |
| **Break of Structure (BOS)** | Swing tracker FSM | BOS arrows + new structure |
| **Change of Character (CHOCH)** | Swing tracker FSM | CHOCH arrows + trend flip |
| **Premium/Discount Zones** | Range midline + Fib OTE | Zones overlay |
| **Market structure** | Aggregator over swings | Trend state per timeframe |

Each detector emits typed events:
```ts
type SMCEvent =
  | { type: 'FVG'; direction: 'bull'|'bear'; top: number; bottom: number; mitigated: boolean }
  | { type: 'OB'; direction: 'bull'|'bear'; top: number; bottom: number; createdAt: number }
  | { type: 'BOS'; direction: 'bull'|'bear'; price: number; at: number }
  | { type: 'CHOCH'; direction: 'bull'|'bear'; price: number; at: number }
  | { type: 'LIQ_SWEEP'; side: 'high'|'low'; price: number; at: number };
```

## 4.3 AI Chart Commentary (LLM)
Prompt template, structured output, streamed via SSE. See `services/ai-engine/src/prompts/`.

## 4.4 Pattern Recognition (Classical)
Head & Shoulders, Double Top/Bottom, Triangles, Wedges, Flags via Perceptually-Important-Points + DTW matcher.

## 4.5 Cost Controls
- LLM call budgets per user tier (Pro: 100/day, Premium: 1,000/day, Institutional: metered)
- Aggressive caching of (symbol, timeframe, bar_close_time) → response

---

# PHASE 5: USER MANAGEMENT & BILLING

## 5.1 Roles
| Role | Capabilities |
|---|---|
| **Guest** | Public charts (delayed 15m), news, market overview |
| **Free** | 1 chart, 2 watchlists × 20 syms, 3 indicators/chart, 5 alerts |
| **Pro** | 4-chart layouts, unlimited watchlists, 25 indicators/chart, 100 alerts, custom scripts |
| **Premium** | 8-chart layouts, intraday tick data, 500 alerts, AI features, Volume Profile, multi-monitor |
| **Institutional** | Seat-based, SSO, FIX gateway, custom data feeds, dedicated CSM |
| **Admin** | Full control |

## 5.2 Subscription Plans
| Plan | Monthly | Annual | Key inclusions |
|---|---|---|---|
| **Free** | $0 | $0 | Delayed data, basic charts |
| **Pro** | $24.95 | $239 (20% off) | Realtime crypto + delayed equities, FinScript |
| **Premium** | $49.95 | $479 | Realtime US equities, AI, 8-chart layouts |
| **Institutional** | from $499/seat | custom | SSO, audit, FIX, SLA |

## 5.3 Payments
- **Stripe** — primary (cards, SEPA, BACS, iDEAL, Apple/Google Pay)
- **PayPal** — alt
- **Crypto** — Coinbase Commerce (BTC, ETH, USDC, USDT)
- **Trial**: 14-day Pro, no card required
- **Dunning**: 3-retry over 14 days; downgrade on hard fail
- **Tax**: Stripe Tax (auto-calc, OSS for EU)

---

# PHASE 6: SOCIAL NETWORK

## 6.1 Features
- **Ideas**: long-form post with attached chart snapshot + structured fields (`bias`, `entry`, `target`, `stop`, `timeframe`)
- **Feed**: chronological + algorithmic (following + trending + similar interests)
- **Comments + threads + reactions**
- **Follow / Unfollow** + private/public profiles
- **DMs** with E2EE option (Signal Protocol via libsignal-bindings)
- **Reputation** score: signal accuracy (R-multiple over time), engagement, helpfulness votes
- **Moderation**: report → triage queue → action; Anthropic moderation API + Perspective for toxicity

## 6.2 Schema (excerpt)
See `database/schemas/social.sql`.

---

# PHASE 7: MOBILE APPLICATION

## 7.1 Stack
- **React Native 0.76** (New Architecture / Fabric / TurboModules)
- **Expo SDK 52** (config, EAS Build, EAS Submit)
- **Skia** for chart rendering (`@shopify/react-native-skia`)
- **Reanimated 3** + **Gesture Handler 2** for 120 Hz interactions
- **MMKV** for local storage
- **Firebase Messaging** + **APNs** for push

## 7.2 Feature Parity (v1)
Charts (single + 2-pane), watchlists, alerts, news, account, simple drawing tools (trendline, horizontal line, rectangle).

## 7.3 Native Modules Needed
- Background WebSocket keepalive (iOS background fetch + Android foreground service)
- Biometric auth (Face ID / fingerprint via `expo-local-authentication`)
- Widget extensions (iOS WidgetKit + Android Glance) for watchlist quotes

---

# PHASE 8: SECURITY & COMPLIANCE

## 8.1 Application Security
- **OWASP ASVS Level 2** baseline
- Input validation everywhere (Zod schemas at API edge)
- CSP `default-src 'self'`, strict; nonce-based for inline scripts
- HSTS preload, `Permissions-Policy`, `Referrer-Policy: strict-origin-when-cross-origin`
- Rate limiting: token bucket per (IP, user, endpoint) at edge + app
- Argon2id password hashing (m=64MB, t=3, p=4)
- Secrets in AWS Secrets Manager, rotated; never in env files committed

## 8.2 Authentication & Authorization
- OAuth 2.1 + PKCE; JWT RS256; short access (5m) + rotating refresh (30d)
- 2FA mandatory for Pro+ (TOTP, WebAuthn passkeys)
- RBAC + per-resource ABAC via Casbin policies
- Step-up auth for billing changes, data export, API key creation

## 8.3 Data Protection
- Encryption at rest: AES-256 (Aurora, EBS, S3 SSE-KMS with per-tenant CMK for Institutional)
- Encryption in transit: TLS 1.3, mTLS service-to-service (Istio)
- Field-level encryption for PII (Postgres + pgcrypto)
- Key management: AWS KMS, rotation every 90 days

## 8.4 Audit & Monitoring
- Immutable append-only audit log in ClickHouse (login, billing, data export, admin actions)
- Real-time SIEM (CloudWatch → Wazuh)
- Anomaly detection on auth events (impossible travel, credential stuffing)

## 8.5 DDoS / Bot
- Cloudflare WAF + Bot Management
- AWS Shield Advanced
- Per-IP and per-account rate limits

## 8.6 KYC / AML (when broker integration ships)
- **Sumsub** or **Onfido** for ID verification
- **ComplyAdvantage** for PEP/sanctions screening
- Transaction monitoring → SAR workflow

## 8.7 Compliance
| Regime | Scope | Actions |
|---|---|---|
| **GDPR** | EU users | DPA, DPO appointment, Article 30 records, DSR portal |
| **MiCA** | EU crypto | CASP authorization if broker (Phase 3) |
| **SEC / FINRA** | US broker (Phase 3) | Broker-dealer reg or partner with introducing broker |
| **SOC 2 Type II** | Enterprise | Year-1 readiness, Year-2 audit |
| **ISO 27001** | Enterprise | Year-2 audit |
| **PCI-DSS SAQ-A** | Card payments | Stripe handles PAN; we keep SAQ-A scope |

---

# PHASE 9: ADMIN PANEL

Standalone Next.js app under `admin.finberg.markets`. Auth = Keycloak with `admin` role.

| Module | Capabilities |
|---|---|
| **Users** | Search, view, impersonate, suspend, reset 2FA, force logout |
| **Subscriptions** | Plan changes, coupons, refunds, comps |
| **Payments** | Stripe webhook explorer, dispute queue, refunds |
| **Reports** | Daily KPIs (MAU, DAU, ARR, churn, LTV/CAC), exportable |
| **Market data monitoring** | Per-provider health, latency, cost, fallback events |
| **Server monitoring** | Embedded Grafana, ArgoCD links, on-call schedule |
| **Support tickets** | Inbox synced with Zendesk/Intercom, internal notes |
| **Feature flags** | Unleash console |
| **Content** | News editing, broadcast announcements |
| **Audit log** | Search/filter, export |

---

# PHASE 10: DEVELOPMENT ROADMAP

## 10.1 MVP — Month 0–4
**Goal**: Live product for 1,000 beta users on crypto + US equities (delayed)

**Features**
- Auth (email + Google)
- Web app: single-chart workspace, 30 indicators, 20 drawings, watchlists, 5 alerts/user
- Crypto realtime (Binance), US equities delayed (Polygon Starter)
- Stripe Pro plan
- Basic news feed (Finnhub)
- Marketing site
- Admin: users + subs

**Team (8)**
- 1 CTO/architect
- 2 senior full-stack
- 1 frontend (charts)
- 1 backend (data)
- 1 DevOps
- 1 designer
- 1 product / PM

**Budget**: ~$480K (4 months, fully loaded)
**Infra cost / month**: $4–6K
**Risks**: chart engine perf, data provider reliability
**Scaling**: monolith-light → split market-data + auth as first cuts

## 10.2 v1.0 — Month 4–9
**Goal**: Public launch, 25,000 users, AI v1, mobile beta

**New features**
- Multi-chart layouts (up to 4)
- FinScript MVP (read-only library + 1-button save)
- Realtime US equities, FX, indices
- Alerts: webhook + Telegram + email
- AI chart commentary
- React Native iOS + Android beta
- Social v0: post ideas + follow + comment

**Team (22)**: + 4 backend, +3 frontend, +2 mobile, +1 ML, +1 SRE, +1 QA, +2 GTM

**Budget**: ~$2.2M (cumulative)
**Infra**: $25K/month
**Risks**: chart engine on mobile, AI cost runaway

## 10.3 v2.0 — Month 9–18
**Goal**: 250K users, institutional offering, full Smart Money AI

**New features**
- All asset classes (commodities, bonds)
- Full FinScript + scripting marketplace (revenue share)
- Smart Money AI suite (FVG, OB, BOS, CHOCH detectors GA)
- Volume Profile, Footprint charts
- 8-chart layouts, multi-monitor
- Institutional tier (SSO, audit, billing)
- Mobile GA + widgets
- Pattern recognition library
- Backtesting engine

**Team (45)**: + dedicated chart team, ML team, broker integration squad, customer success

**Budget**: ~$6.8M (cumulative)
**Infra**: $90K/month (incl. exchange data fees)

## 10.4 v3.0 — Month 18–30
**Goal**: 1M users, broker connectivity, global compliance

**New features**
- Broker connectivity (Interactive Brokers, Alpaca, Binance, Kraken, OANDA)
- Paper trading engine (in-house matching)
- FIX 5.0 gateway for institutions
- Options chains + Greeks
- White-label SaaS offering
- Tournament + copy-trading
- On-chain crypto wallet integration (Phantom, MetaMask)

**Team (80)**: + broker eng (8), compliance (4), legal, regional GTM

**Budget**: ~$18M (cumulative)
**Infra**: $300K/month

---

# PHASE 11: SOURCE CODE STRUCTURE

```
finberg-markets/
├── apps/
│   ├── web/                  # Next.js 15 main app (charts, social, account)
│   ├── mobile/               # React Native + Expo
│   └── admin/                # Next.js admin console
├── services/                 # NestJS microservices
│   ├── api-gateway/
│   ├── auth/
│   ├── users/
│   ├── market-data/          # + Go hot-path subdir
│   ├── charts/
│   ├── indicators/
│   ├── watchlists/
│   ├── alerts/
│   ├── notifications/
│   ├── ai-engine/
│   ├── payments/
│   └── social/
├── packages/
│   ├── shared/               # Shared TS types, validators, constants
│   ├── ui/                   # Shared React components (shadcn/ui base)
│   └── finscript/            # Compiler + runtime
├── infrastructure/
│   ├── docker/               # docker-compose for local dev
│   ├── kubernetes/           # Helm charts per service
│   ├── terraform/            # AWS infra
│   └── github-actions/       # Reusable workflows
├── database/
│   ├── schemas/              # Reference SQL per domain
│   ├── migrations/           # Prisma + Drizzle migrations
│   └── seeds/
├── docs/
│   ├── architecture/
│   ├── api/                  # OpenAPI specs
│   ├── business/
│   └── roadmap/
├── turbo.json                # Turborepo pipeline
├── pnpm-workspace.yaml
└── BLUEPRINT.md              # this document
```

See `docs/architecture/` for deep dives and per-service READMEs in each service folder.

---

# PHASE 12: BUSINESS MODEL & FINANCIALS

## 12.1 Revenue Model
- **B2C subscriptions** (Free / Pro / Premium)
- **B2B Institutional** (per-seat licensing, custom contracts)
- **Marketplace revenue share** (FinScript indicators: 80/20 author/platform)
- **Data API** (resold to fintechs, paid per call)
- **White-label** SaaS license fees

## 12.2 Cost Model (Monthly, by user scale)
| Cost line | 1K | 10K | 100K | 1M |
|---|---|---|---|---|
| Compute (EKS, EC2) | $1,200 | $7,500 | $48,000 | $280,000 |
| Databases (Aurora, Timescale, Redis, ClickHouse) | $900 | $5,500 | $32,000 | $180,000 |
| Object storage (S3 + CloudFront) | $200 | $1,500 | $9,000 | $55,000 |
| **Market data licensing** | $220 | $3,300 | $35,000 | $180,000 |
| AI / LLM | $300 | $4,000 | $25,000 | $120,000 |
| Email, SMS, push | $50 | $400 | $3,500 | $25,000 |
| Cloudflare + WAF | $200 | $600 | $2,500 | $14,000 |
| SaaS tools (Sentry, Datadog, etc) | $400 | $2,500 | $11,000 | $40,000 |
| **Total infra** | **$3,470** | **$25,300** | **$166,000** | **$894,000** |

## 12.3 Revenue Projections
Assumptions:
- Conversion free→paid: 4%
- ARPU paid: $32/mo (blended Pro+Premium+Institutional)
- Annual churn: 35% Pro, 18% Premium, 8% Institutional

| Scale | MAU | Paid | MRR | ARR | Infra | Gross margin |
|---|---|---|---|---|---|---|
| 1K | 1,000 | 40 | $1,280 | $15,360 | $3,470 | **negative** (validation phase) |
| 10K | 10,000 | 400 | $12,800 | $153,600 | $25,300 | **negative** (investment) |
| 100K | 100,000 | 4,000 | $128,000 | $1,536,000 | $166,000 | **break-even** |
| 1M | 1,000,000 | 40,000 | $1,280,000 | $15,360,000 | $894,000 | **~30% net** after S&M |

## 12.4 Capital Plan
- **Seed**: $1.5M (MVP + 9 months runway)
- **Series A**: $8M at v1 launch
- **Series B**: $25M at v2 launch (300K users, $10M ARR)

## 12.5 Path to Profitability
~~~
Year 1: -$1.8M  (validation)
Year 2: -$5.0M  (growth investment)
Year 3:  $0.5M  (break-even)
Year 4: $12M    (scale)
Year 5: $45M    (institutional + intl)
~~~

## 12.6 Key Risks & Mitigations
| Risk | Mitigation |
|---|---|
| Data licensing cost spiral | Multi-vendor router + intelligent caching; direct exchange feeds at scale |
| TradingView competition | Differentiate via AI/SMC + institutional features + white-label |
| Regulatory tightening (MiCA, MiFID II) | Compliance-by-design; full-time counsel from v1 |
| Chart engine performance | Custom canvas/WebGL from day 1; benchmark gates in CI |
| Talent (Rust/Go hot-path engineers) | Remote-first; equity-heavy comp |

---

## Appendices

- **A**: API surface (OpenAPI) — `docs/api/openapi.yaml`
- **B**: Database schemas — `database/schemas/`
- **C**: Terraform modules — `infrastructure/terraform/`
- **D**: Kubernetes Helm charts — `infrastructure/kubernetes/`
- **E**: FinScript spec — `packages/finscript/SPEC.md`
- **F**: Threat model — `docs/architecture/threat-model.md`
- **G**: SLO/SLI definitions — `docs/architecture/slo.md`
