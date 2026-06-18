# `@finberg/payments` — Payments & Subscriptions

Stripe-primary billing with PayPal + crypto (Coinbase Commerce) alternatives.

## Responsibilities
- Plan catalog sync with Stripe Products / Prices
- Checkout session creation (web + portal)
- Subscription lifecycle (create, update plan, pause, cancel)
- Invoice + dunning + proration handling
- Webhook intake from Stripe / PayPal / Coinbase with idempotency
- Tax: Stripe Tax (auto)
- Coupons + comps
- Institutional seat management

## Interface
- HTTP: `POST /checkout/session`, `POST /portal/session`, `GET /subscription`, `POST /subscription/cancel`, `POST /webhooks/{provider}`
- Internal: subscription state cached in Redis, broadcast via Kafka topic `billing.events`

## Key Tables
`plans`, `subscriptions`, `invoices`, `payment_methods`, `webhook_events`.

## Security
- Stripe signing-secret enforcement on every webhook
- Card data never touches our infra — Stripe Elements / SetupIntent only
