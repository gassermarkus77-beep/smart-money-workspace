# Financial Model — FINBERG MARKETS

> Detailed companion to `BLUEPRINT.md` § Phase 12.

## 1. Pricing

| Plan | Monthly | Annual (20% off) | Realtime data |
|---|---|---|---|
| Free | $0 | $0 | delayed 15m |
| Pro | $24.95 | $239 | crypto realtime; equities delayed |
| Premium | $49.95 | $479 | full realtime + AI |
| Institutional | from $499/seat | custom | + SSO, audit, FIX, SLA |

ARPU assumption (blended paid): **$32/mo**.

## 2. Conversion + Churn Assumptions

| Metric | MVP | v1 | v2 | v3 |
|---|---|---|---|---|
| Free→paid conversion | 2% | 3% | 4% | 5% |
| Pro annual churn | 50% | 40% | 35% | 30% |
| Premium annual churn | 30% | 22% | 18% | 15% |
| Institutional annual churn | 15% | 12% | 10% | 8% |
| CAC blended | $90 | $80 | $70 | $60 |
| LTV (Premium) | $185 | $240 | $310 | $360 |

## 3. Monthly Cost Model (USD)

| Cost | 1K | 10K | 100K | 1M |
|---|---|---|---|---|
| EKS / EC2 compute | 1,200 | 7,500 | 48,000 | 280,000 |
| Aurora + Timescale + Redis + ClickHouse | 900 | 5,500 | 32,000 | 180,000 |
| S3 + CloudFront | 200 | 1,500 | 9,000 | 55,000 |
| Market data licensing | 220 | 3,300 | 35,000 | 180,000 |
| AI / LLM | 300 | 4,000 | 25,000 | 120,000 |
| Email / push / SMS | 50 | 400 | 3,500 | 25,000 |
| Cloudflare + WAF | 200 | 600 | 2,500 | 14,000 |
| SaaS tooling (Sentry, DataDog, Linear) | 400 | 2,500 | 11,000 | 40,000 |
| **Total infra** | **3,470** | **25,300** | **166,000** | **894,000** |

## 4. Revenue Model

| Scale | MAU | Paid | MRR | ARR |
|---|---|---|---|---|
| 1,000 | 1,000 | 20 | $640 | $7,680 |
| 10,000 | 10,000 | 300 | $9,600 | $115,200 |
| 100,000 | 100,000 | 4,000 | $128,000 | $1,536,000 |
| 1,000,000 | 1,000,000 | 50,000 | $1,600,000 | $19,200,000 |

(uses target conversion at each scale and ARPU $32)

## 5. Gross Margin

| Scale | ARR | Infra | Gross | GM% |
|---|---|---|---|---|
| 1K | $7.7K | $42K | -$34K | — |
| 10K | $115K | $304K | -$189K | — |
| 100K | $1.5M | $2.0M | -$0.5M | break-even with mix shift to Premium |
| 1M | $19.2M | $10.7M | $8.5M | 44% |

## 6. Capital Plan

| Round | Amount | When | Use |
|---|---|---|---|
| Seed | $1.5M | T-0 | MVP team + 9 months runway |
| Series A | $8M | v1 launch | Scale eng, GTM, mobile |
| Series B | $25M | v2 launch | Institutional sales, intl, broker |

## 7. P&L Trajectory

| Year | Revenue | Costs | Net |
|---|---|---|---|
| 1 | $0.2M | $2.0M | -$1.8M |
| 2 | $2.1M | $7.1M | -$5.0M |
| 3 | $9.0M | $8.5M | $0.5M |
| 4 | $22M | $10M | $12M |
| 5 | $58M | $13M | $45M |

## 8. Sensitivity Levers
- **Conversion +1pp**: ARR +30%, near-zero cost impact
- **Data licensing -25%** (direct exchange feeds at scale): infra -$45K/mo @ 1M users
- **AI cost +50%** (longer prompts / more usage): margin -3pp
