# WS6 — Observability, Rate Limits, Disaster Recovery

## Problem

Fortune 500 customers require evidence that the platform is observable,
rate-limited, and recoverable. Specifically:

- Full tracing from the UI through the Worker to Postgres (W3C Trace
  Context).
- Server-side rate limits per (org, endpoint) with documented caps.
- Documented RTO/RPO targets with tested restore procedures.

## Solution

### 1. Sentry (browser + Worker)

`dashboard/src/lib/observability/sentry.ts`

- Lazy-loaded — `@sentry/browser` is only fetched when `VITE_SENTRY_DSN`
  is set, so the default bundle does not pay for it.
- Exposes `captureException`, `captureMessage`, `identify`,
  `breadcrumb`.
- `identify()` tags users with `{ id, org_id }` so Sentry issues are
  partitioned per-tenant.

Workers capture exceptions via the `onError` hook already present in
`workers/*/index.ts`; configuration is shared through
`SENTRY_WORKER_DSN` secret.

### 2. OpenTelemetry (minimal tracer)

`dashboard/src/lib/observability/otel.ts`

- Zero-dep tracer that emits W3C `traceparent` headers and `SpanData`
  records to registered exporters.
- Call `startSpan(name, attrs)` for any cross-boundary operation; the
  resulting span's `ctx` is threaded into the outgoing request header
  `traceparent`.
- The full `@opentelemetry/sdk-trace-web` SDK can replace this shim
  when the ops team is ready — the API surface is congruent.

Conventional attributes:

| Attribute | Meaning |
|---|---|
| `org.id` | tenant uuid |
| `user.id` | user uuid |
| `db.table` | Supabase table name |
| `db.operation` | list/get/create/update/remove |
| `http.status_code` | when applicable |

### 3. Rate limits

**Client** — `dashboard/src/lib/observability/rateLimit.ts`: token
buckets (`list`, `mutation`, `export`) used as a courtesy guard against
bursts from the same tab.

**Server** — `workers/rateLimiter.ts`: Durable Object backed authoritative
limiter. Gateways call `enforceRateLimit(env, key, { capacity, refillPerSecond })`
and return 429 with `Retry-After` when exceeded.

Defaults (per user unless noted):

| Endpoint class | Capacity | Refill | Cost |
|---|---|---|---|
| list | 100/min | 10 tok/s | 1 |
| mutation | 30/min | 0.5 tok/s | 1 |
| export (per org) | 5/min | 0.1 tok/s | 1 |

### 4. Disaster recovery targets

| Metric | Target | How measured |
|---|---|---|
| **RTO** | 2 hours | Time from declared incident to primary region restored |
| **RPO** | 5 minutes | Supabase PITR lag (logical backups + WAL streaming) |
| **Backup test cadence** | Monthly | Restore into staging from latest PITR; smoke-test top 20 tables |
| **Failover region** | `us-east-1 → us-west-2` | DNS cut-over in Cloudflare |

Documented restore procedure: `docs/operations/runbooks/dr-restore.md` (added in
this PR).

## Integration with the service layer

- `dashboard/src/lib/telemetry.ts` (from WS3) registers listeners that
  fan out to Sentry + OTEL exporters at app bootstrap time.
- `dashboard/src/lib/serviceFactory.ts` emits spans around every read
  via its future `withSpan` decorator (follow-up PR — not in scope for
  WS6).

## What is NOT in this workstream

- Full @opentelemetry/sdk-trace-web integration — the shim is
  production-safe and the SDK lands in a dedicated ops PR.
- Automatic rate-limit evidence collection into the compliance module
  — lands in WS9 with the demo seed.
