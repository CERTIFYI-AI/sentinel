# Enforcement gateway deployment (free always-on VM)

**Status:** ready — needs a free VM and a `.env`. **Owner:** Platform.
**Raised:** 2026-08-18. **Cost:** $0 (free-tier VM + Cloudflare free).

The **enforcement gateway** is `POST /v1/chat/completions` in
[`sentinel/proxy.py`](../../sentinel/proxy.py) — the inline LLM proxy that
resolves the tenant, rate-limits (Redis), sanitizes the prompt, routes through
the circuit breaker to the provider (litellm), and writes the audit chain. It is
**data-plane**: on the path of every LLM call, stateful, streaming,
provider-calling. Unlike the control-plane pieces (connect → edge function,
worker → GitHub Actions), it **cannot be serverless** — it needs one always-on
process. This runbook stands it up on a free VM. Full rationale:
[`../architecture/deployment-topology.md`](../architecture/deployment-topology.md).

## What runs

[`docker-compose.gateway.yml`](../../docker-compose.gateway.yml) — two services
(plus optional ingress), off the repo's existing image:

| Service | What |
| ------- | ---- |
| `gateway` | `uvicorn sentinel.proxy:app` — the enforcement endpoint. |
| `redis` | Rate-limit store (bundled; no external dependency). |
| `cloudflared` *(profile `tunnel`)* | Cloudflare Tunnel ingress — no open ports, free TLS. |

`SENTINEL_DATABASE_URL` points at Supabase; there is **no local Postgres**. The
runtime footprint is light — spaCy/torch are not dependencies, so the sanitizer
runs in regex/keyword fallback and the process fits comfortably in ~512 MB.

## 1. Get a free VM

**Recommended: Oracle Cloud "Always Free".** An Ampere Arm (or AMD micro)
instance is free *forever* (not a trial) with ample RAM/headroom. **GCP
`e2-micro` Always Free** (1 GB, one US region) also works given the light
footprint. Any always-on box with Docker is fine; scale-to-zero platforms
(Cloud Run/Fly free) are **not** — cold starts land on your enforcement latency.

Install Docker + the compose plugin on the VM, then clone the repo (or copy the
image + the two compose/env files).

## 2. Configure

```bash
cp .env.gateway.example .env
# Fill in: SENTINEL_SECRET_KEY (openssl rand -hex 32), SENTINEL_DATABASE_URL
# (Supabase service-role pooler DSN), REDIS_PASSWORD, and the provider keys
# your tenants use (OPENAI_API_KEY / ANTHROPIC_API_KEY). Keep SENTINEL_REDIS_URL's
# password in sync with REDIS_PASSWORD.
```

## 3. Bring it up

```bash
# App + Redis only (reachable on the VM at 127.0.0.1:8000):
docker compose -f docker-compose.gateway.yml up -d

# Verify locally on the VM:
curl -s http://127.0.0.1:8000/health        # -> {"status":"healthy"} (or similar)
```

## 4. Expose it — Cloudflare Tunnel (recommended, free)

You already run Cloudflare. A **Tunnel** gives the gateway a public HTTPS
hostname with **no open inbound ports** on the VM and no certificate to manage:

1. Cloudflare Zero Trust → Networks → Tunnels → create a tunnel; copy its token.
2. Add a public hostname (e.g. `gateway.certifyi.ai`) routed to
   `http://gateway:8000`.
3. Put the token in `.env` as `CLOUDFLARE_TUNNEL_TOKEN`, then:

```bash
docker compose -f docker-compose.gateway.yml --profile tunnel up -d
```

Cloudflare terminates TLS at the edge and forwards to the gateway. (Alternatives
if you prefer: a Cloudflare-proxied DNS `A` record to the VM on origin port 8080,
or Caddy on the VM for auto-TLS. The Tunnel is the least-exposed option.)

## 5. Point clients at it

Customer/app LLM SDKs set their base URL to the gateway hostname and send a
tenant JWT as the bearer token:

```
OpenAI-compatible base URL:  https://gateway.certifyi.ai/v1
Authorization:               Bearer <tenant JWT>
```

The gateway enforces rate limits, sanitization and audit, then proxies to the
real provider. `stream: true` requests stream through.

## Operating notes

- **Provider keys** are read by litellm from the standard env names
  (`OPENAI_API_KEY`, `ANTHROPIC_API_KEY`), not from a Sentinel-specific var.
- **Redis** is the rate-limit store; if it is down the app falls back to
  in-memory limits (per-process, lost on restart) — so keep the `redis` service
  healthy for real enforcement.
- **Updates:** `git pull && docker compose -f docker-compose.gateway.yml up -d --build`.
- **Health/metrics:** `/health` and `/metrics` (Prometheus text) are served by
  the gateway.
- **App identity:** the gateway is `sentinel.proxy:app`, a different FastAPI app
  from `sentinel.api.main:app` (the ~30 `/api/*` routers). The dashboard talks to
  Supabase directly and does not need either hosted; only the gateway does. See
  TD-019 and the topology doc.
