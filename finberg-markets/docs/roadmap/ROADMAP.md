# FINBERG MARKETS — Engineering Roadmap

> Companion to `BLUEPRINT.md` § Phase 10. Read together.

---

## MVP (Months 0–4) — "It works for me and 1,000 friends"

### Engineering scope
- Monorepo bootstrap, CI green, dev infra in Docker
- Auth (email + Google), JWT issuance, refresh rotation
- API gateway with Swagger, rate-limit, structured logs
- Market data: Binance realtime + Polygon delayed for US equities, REST backfill
- Web app: single-chart workspace, 30 indicators, 20 drawings, watchlists, 5 alerts
- Alerts engine v0 (price only) → email + in-app
- Stripe Pro plan + checkout + webhook handling
- Admin: users + subs (read-only)
- Marketing site
- Local dev: `pnpm dev:infra && pnpm dev` works end-to-end

### Out of scope
Mobile · AI · FinScript · Multi-chart · Realtime equities

### Hiring (8)
CTO, 2 senior FS, 1 frontend (charts), 1 backend (data), 1 DevOps, 1 designer, 1 PM

### Budget
$480K · Infra $4–6K/mo

---

## v1.0 (Months 4–9) — "Public launch"

### Engineering scope
- Multi-chart layouts (1/2/3/4 grid)
- FinScript MVP: read-only marketplace + 1-button save
- Realtime US equities, FX (Twelve Data), indices
- Alerts: webhook + Telegram + email + push
- AI chart commentary (Opus 4.8 SSE), basic SMC detector (FVG, OB)
- React Native iOS + Android beta (charts, watchlists, alerts)
- Social v0: post ideas + follow + comment
- Keycloak migration; institutional SSO (SAML 2.0)

### Hiring (22)
+ 4 backend, +3 frontend, +2 mobile, +1 ML, +1 SRE, +1 QA, +2 GTM

### Budget
$2.2M cumulative · Infra $25K/mo

### Risks
Chart engine on mobile · LLM cost runaway · provider reliability under load

---

## v2.0 (Months 9–18) — "Institutional grade"

### Engineering scope
- All asset classes (commodities, bonds)
- Full FinScript + paid marketplace (rev share)
- Smart Money AI GA (FVG, OB, BOS, CHOCH, sweeps)
- Volume Profile, Footprint, DOM
- 6/8-chart layouts, multi-monitor sync
- Institutional tier (SSO, audit, billing, custom data feeds)
- Mobile GA + iOS widgets + Android Glance
- Backtesting engine (server-side script execution over historical bars)
- Pattern recognition library (classical + LLM-vision)

### Hiring (45)
+ chart team (4), ML team (4), broker integration squad (4), CS (3)

### Budget
$6.8M cumulative · Infra $90K/mo

---

## v3.0 (Months 18–30) — "Trade through us"

### Engineering scope
- Broker connectivity: Interactive Brokers, Alpaca, Binance, Kraken, OANDA
- Paper trading engine (in-house matching simulator in Rust)
- FIX 5.0 gateway for institutions
- Options chains + Greeks + payoff diagrams
- Tournaments + copy-trading
- White-label SaaS product line
- Web3 wallet integration (Phantom, MetaMask)
- Multi-region active-active

### Hiring (80)
+ broker engineering (8), compliance + legal (4), regional GTM (6)

### Budget
$18M cumulative · Infra $300K/mo

---

## Quarterly OKR template

| Quarter | Theme | Headline metric |
|---|---|---|
| Q1 | Foundations | 1K active beta users; 99.5% web uptime |
| Q2 | Charts that don't suck | TTI < 2.5s p75; chart frame time < 16ms p99 |
| Q3 | Launch | $30K MRR; 4% free→paid |
| Q4 | Mobile + AI | 25K downloads; AI used by > 30% of paid |
