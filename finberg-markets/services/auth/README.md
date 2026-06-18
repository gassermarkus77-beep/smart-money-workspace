# `@finberg/auth` — Authentication Service

Owns the user identity lifecycle: signup, login, OAuth, 2FA, JWT issuance and rotation, password reset, email verification, WebAuthn passkeys, and session revocation.

## Responsibilities
- OAuth 2.1 + OpenID Connect compliant token issuance
- Federation: Google, Apple, GitHub, Microsoft, LinkedIn
- TOTP (RFC 6238) + WebAuthn (passkeys) + recovery codes
- Argon2id password hashing (m=64MB, t=3, p=4)
- Refresh token rotation with reuse-detection
- Step-up auth for sensitive operations
- Audit emit to `audit.events` Kafka topic

## Interface
- HTTP: `POST /signup`, `POST /login`, `POST /refresh`, `POST /logout`, `POST /mfa/*`, `POST /oauth/{provider}/callback`
- gRPC (internal): `VerifyToken`, `RevokeToken`, `IntrospectUser`

## Key Tables
See `database/schemas/users.sql` — `users`, `oauth_identities`, `user_mfa`, `sessions`, `api_keys`.

## Tech
NestJS + Fastify, Prisma, jose (JWT), argon2, otplib, @simplewebauthn/server.

## Status
Scaffold pending — gateway exposes a minimal in-memory facade for local dev (see `services/api-gateway/src/modules/auth/`). Promote to standalone service when extracting.
