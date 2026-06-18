# `@finberg/users` — Users Service

Owns user profiles, preferences, RBAC, and organization membership.

## Responsibilities
- Profile read/update (display name, avatar, bio, locale, tz)
- Preferences (theme, default symbol, default timeframe, notifications)
- RBAC policy resolution (per-role + per-resource ABAC via Casbin)
- Organization seats & invitations
- Account deletion (GDPR Article 17, soft delete then 30-day purge)
- User reputation rollup (nightly job)

## Interface
- HTTP: `GET/PATCH /users/me`, `GET /users/{username}`, `POST /orgs`, `POST /orgs/{id}/invite`
- gRPC (internal): `GetUser`, `CheckPermission`, `ListOrgMembers`

## Key Tables
`users`, `organizations`, `organization_members`, `user_reputation`.
