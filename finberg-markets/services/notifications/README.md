# `@finberg/notifications` — Multi-Channel Sender

Consumes the `notifications.dispatch` subject from NATS, looks up user preferences, and fans out to the right channels with idempotency + retries.

## Channels
- `in_app` (WebSocket push via Redis pub/sub)
- `email` (Amazon SES; MJML templates)
- `push` (Firebase Cloud Messaging + APNs)
- `telegram` (Bot API)
- `slack` / `discord` (incoming webhook)
- `webhook` (user-defined; HMAC-signed)
- `sms` (Twilio; only for Premium+)

## Delivery Guarantees
- At-least-once with idempotency key on `notifications_outbox`
- Exponential backoff: 1s → 30s → 5m → 30m → dead-letter
- Per-channel rate limits to respect provider quotas

## Interface
- HTTP: `GET /preferences`, `PUT /preferences`, `POST /test/{channel}`
- NATS subscriptions: `notifications.dispatch`

## Key Tables
`notifications_outbox`.
