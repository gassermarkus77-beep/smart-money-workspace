# `@finberg/social` — Social Network Service

Powers ideas, comments, follows, DMs, reputation, and moderation.

## Responsibilities
- Post lifecycle: idea / note / question
- Comment threads with nesting
- Follow graph (denormalized counts kept fresh via Postgres triggers)
- Direct messages (optionally E2EE via libsignal)
- Reactions (`like`, `agree`, `disagree`, `insightful`)
- Reputation rollup (nightly job; signal accuracy in R-multiples)
- Moderation: Anthropic Moderation API + Perspective + manual review queue

## Interface
- HTTP: `GET/POST/PATCH/DELETE /posts`, `GET /feed`, `POST /follow`, `POST /reactions`, `GET/POST /dms`
- WebSocket: `/social` namespace for live comments / DM delivery

## Key Tables
`posts`, `comments`, `reactions`, `follows`, `dm_threads`, `dm_participants`, `dm_messages`, `user_reputation`.
