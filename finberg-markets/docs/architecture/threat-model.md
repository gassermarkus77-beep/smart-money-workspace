# Threat Model — FINBERG MARKETS

Frame: STRIDE applied per trust boundary. Re-reviewed every major release or whenever a new external surface ships.

## Trust boundaries

```
[ Internet ] ── Cloudflare ── ALB ── API Gateway ── Service Mesh ── Services ── Data Plane
```

| Boundary | Crossings | Controls |
|---|---|---|
| Internet → Edge | HTTPS, WSS | TLS 1.3, HSTS, WAF, DDoS, bot mgmt, geo-blocking optional |
| Edge → Gateway | mTLS optional | ALB → ACM cert, security groups |
| Gateway → Services | mTLS via Istio | Service identities (SPIFFE), NetworkPolicies |
| Services → Data Plane | TLS | DB IAM-auth, ElastiCache TLS, MSK TLS+SASL |
| User → Auth | OAuth/OIDC | PKCE, JWT RS256, refresh rotation |

## STRIDE per surface

### Public API
| Threat | Mitigation |
|---|---|
| Spoofing | OAuth, MFA, WebAuthn |
| Tampering | Per-request signature on webhooks (HMAC), TLS, Argon2id on passwords |
| Repudiation | Append-only audit log in ClickHouse, immutable WORM bucket for compliance exports |
| Info disclosure | Field-level encryption for PII, principle of least privilege via Casbin |
| DoS | Cloudflare + WAF + per-IP rate limit + per-user concurrency cap |
| Elevation of privilege | RBAC + ABAC, role boundaries enforced in gateway |

### WebSocket multiplexer
| Threat | Mitigation |
|---|---|
| Symbol flood subscribe | Per-connection sub cap, payload size cap, heartbeat idle disconnect |
| Slow-loris | Connection budget per IP, write-back-pressure timeouts |
| Cross-tenant data leak | Server-issued symbol allowlist per JWT scope |

### Indicator script execution (FinScript)
| Threat | Mitigation |
|---|---|
| Code execution escape | `isolated-vm` sandbox, no `eval`/`Function`, no network, CPU & memory caps |
| Resource exhaustion | Per-script 5ms/bar wall-clock + 32 MiB memory + 1MB output cap |
| Malicious marketplace script | Static analysis (Semgrep custom rules), human review gate for paid scripts |

### Payments
| Threat | Mitigation |
|---|---|
| Webhook spoofing | Stripe signing secret + replay window check |
| Replay | Idempotency keys on `webhook_events` |
| Refund fraud | Manual approval over $X via admin console |

### AI Engine
| Threat | Mitigation |
|---|---|
| Prompt injection from news data | Treat external text as `untrusted` envelope; system prompt forbids tool calls |
| Cost runaway | Per-user budget + global throttle + cached responses keyed by (symbol, tf, bar_close) |
| PII leakage to LLM | Never include user emails, IDs, or payment data in prompts |

## Out-of-scope (call-outs)
- Physical security (cloud provider)
- Insider threat (separate program: SOC 2 controls + access reviews)

## Review cadence
Each release `>=` minor version; on every new external dependency or data flow.
