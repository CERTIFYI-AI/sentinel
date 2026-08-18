# Deployment topology — where each piece runs, and why

**Raised:** 2026-08-18. **Owner:** Platform.

Sentinel is not one deployable. It is a set of services with very different
runtime needs, and the cost-correct answer is to host each where it fits — not
to force them all onto one platform. This doc records the split, so the next
person does not re-litigate it (or, worse, move the gateway onto an edge
function).

## The two tiers

**Control-plane** — management actions: infrequent, short, off the request hot
path, no streaming, no provider calls. These are a natural fit for **serverless,
and run for $0**:

| Piece | Runs on | Notes |
| ----- | ------- | ----- |
| Dashboard (SPA) | Cloudflare Worker | Talks to Supabase directly. |
| `integrations-connect` (connect/sync/available) | Supabase Edge Function | Encrypts credentials, enqueues sync jobs. |
| Evidence sync worker | Scheduled GitHub Actions (drain-once) | Runs the Python adapters daily; free minutes. |
| Governance mesh, notifications, digests | Supabase Edge Functions + `pg_cron` | Event-driven. |
| Data & migrations | Supabase (Postgres + RLS) | The system of record. |

**Data-plane** — the enforcement gateway: **inline on every LLM call**,
stateful, streaming, provider-calling. This one **needs an always-on host**:

| Piece | Runs on | Notes |
| ----- | ------- | ----- |
| Enforcement gateway `POST /v1/chat/completions` (`sentinel.proxy:app`) | One always-on VM (free tier) + Redis | Rate-limit, sanitize, circuit-break, proxy to provider, audit. |

## Why the gateway can't be serverless

`sentinel/proxy.py`'s gateway, per request:

- resolves the tenant (DB) and **rate-limits via a warm Redis connection**;
- **sanitizes** the prompt (Python policy stack);
- routes through a **circuit breaker** to **call the provider** (litellm), and
  **streams** the response when asked;
- writes the **audit chain**.

An edge function is the wrong host on every axis: it can't hold a Redis pool,
it's CPU-time-limited (a streaming completion blows the budget), it can't run
the Python policy stack without a full rewrite, and cold starts land directly on
your enforcement latency. So the gateway stays a hosted FastAPI process. That is
not a failure to "modernize" — it is matching the host to the workload.

## Why this is not "abandoning FastAPI"

The FastAPI code is intact. What changed is *hosting*, driven by budget:

- **Measured dependence.** Of ~597 dashboard files, **106 use Supabase
  directly**; the frontend's only live tie to a hosted FastAPI was one events
  WebSocket (which degrades gracefully) and one **unreferenced** config default.
  So dropping the always-on FastAPI host for the *dashboard* changed almost
  nothing.
- **The gateway is the exception**, and it keeps FastAPI — just on a free VM
  instead of a paid platform.

The removed Fly config (`fly.toml`, `deploy-backend.yml`) targeted
`sentinel.api.main:app` — the ~30 `/api/*` routers the dashboard does **not**
call. It never hosted the gateway (`sentinel.proxy:app`) in the first place, so
removing it took away nothing that was running.

## Runbooks

- Control-plane (connect + worker): [`../operations/backend-deployment.md`](../operations/backend-deployment.md)
- Data-plane (gateway): [`../operations/gateway-deployment.md`](../operations/gateway-deployment.md)

## Known debt

The two Python FastAPI apps (`sentinel.api.main:app` and `sentinel.proxy:app`)
plus the `integrations-connect` edge function are **three** surfaces that
partially overlap and can drift (**TD-019**). Consolidating the Python side onto
one app, and treating the edge function as the single deployed connect surface,
is the standing cleanup. Until then: the gateway is `proxy:app`, connect is the
edge function, and the `main:app` routers are unhosted and unused by the
dashboard.
