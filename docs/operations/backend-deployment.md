# Evidence pipeline deployment (free tier)

**Status:** ready — needs a few secrets and one `supabase functions deploy`.
**Owner:** Platform. **Raised:** 2026-08-18. **Cost:** $0 (Supabase + GitHub
free tiers).

The integration evidence pipeline needs two server-side pieces. Neither is a
paid always-on host:

| Piece | Runs on | What it does |
| ----- | ------- | ------------ |
| **connect / sync / available** | **Supabase Edge Function** `integrations-connect` (free) | Encrypts credentials (AES-256-GCM), upserts the `integrations` row, enqueues a `background_jobs` sync. |
| **sync worker** | **GitHub Actions** scheduled job (free minutes) | Drains the queue: runs the provider adapters, writes findings, maps them to controls, refreshes evidence, promotes `configuring → connected`. |

Why this shape: credentials must be encrypted with a key the browser never
sees, and enqueueing is a service-role write — both belong server-side, which
the edge function provides for free. The worker is Python (the adapters use
`boto3`/`PyGithub`), so it runs as a scheduled Actions job in **drain-once**
mode instead of a 24/7 process. This replaces the earlier Fly.io plan, which
was dropped because a continuous worker is not free.

## 1. Deploy the edge function

```bash
# From the repo root, with the Supabase CLI logged in and the project linked:
supabase functions deploy integrations-connect --project-ref vhparvughsygyknblkzt

# Set the one secret it needs beyond the injected SUPABASE_* vars.
# SENTINEL_CREDENTIALS_KEY must be base64 that decodes to exactly 32 bytes, and
# must be the SAME value the worker uses (below) — they are two ends of one cipher.
supabase secrets set \
  SENTINEL_CREDENTIALS_KEY="$(openssl rand -base64 32)" \
  --project-ref vhparvughsygyknblkzt
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected
into edge functions automatically — you do not set them.

> **⚠️ `SENTINEL_CREDENTIALS_KEY` is permanent.** It AES-decrypts stored
> integration credentials. Save it somewhere safe; rotating it makes every
> already-stored credential blob undecryptable. Generate it **once** and reuse
> the identical value for the worker.

The frontend already calls this function via `supabase.functions.invoke` — no
`VITE_SENTINEL_API_URL` and no separate API host. Once the function is deployed,
the Connect button works; nothing else in the dashboard needs to change.

## 2. Wire the scheduled worker

Add two **repository secrets** (Settings → Secrets and variables → Actions):

| Secret | Value |
| ------ | ----- |
| `SENTINEL_DATABASE_URL` | Service-role Postgres DSN for the project (Supabase → Database → Connection pooling) |
| `SENTINEL_CREDENTIALS_KEY` | **The same** base64 key you set on the edge function |

The worker runs daily via
[`.github/workflows/evidence-worker.yml`](../../.github/workflows/evidence-worker.yml)
and skips with a notice until both secrets exist. Trigger it on demand from the
Actions tab (**Evidence Worker → Run workflow**) to test.

The five `pg_cron` schedules (including `daily-integration-sync`) still need
**Deploy Migrations** to have run against the project — that is what enqueues
recurring sync jobs for the worker to drain. See
[`../../supabase/migrations/README.md`](../../supabase/migrations/README.md).

## 3. Verify the loop turns

```bash
# Edge function answers (needs a signed-in session token; from the app it just works):
#   Connect an integration in the UI → a row appears in `integrations` (status='configuring').

# Trigger the worker once (Actions → Evidence Worker → Run workflow), then check:
select catalog_slug, status, last_run_status, last_sync_at
from public.integrations where is_deleted = false order by updated_at desc;
```

A freshly connected integration should reach `status='connected'`,
`last_run_status='success'` after the first worker run — the promotion that lets
the daily cron re-collect it. If it stays `configuring`, the worker hasn't run
yet (or its secrets are missing) — check the Actions run log.

## Crypto interop

The edge function and the Python worker must agree byte-for-byte on the
credential blob, or every sync would fail on decryption. That contract is pinned
by `supabase/functions/integrations-connect/crypto_interop_test.ts`, which
asserts Web Crypto AES-GCM reproduces a fixed vector the Python
`cryptography` library produced. Run it with
`deno test supabase/functions/integrations-connect/`.

## Scope: this runbook is the CONTROL-PLANE only

This covers the management pieces — connect (edge function) and the evidence
worker (scheduled Actions). The **enforcement gateway**
(`POST /v1/chat/completions`, the inline LLM proxy) is **data-plane** and is
deployed separately, on an always-on free VM — see
[`gateway-deployment.md`](gateway-deployment.md). Why the split exists (and why
the gateway can't be an edge function) is in
[`../architecture/deployment-topology.md`](../architecture/deployment-topology.md).

## Note on the Python API

`sentinel/api/main.py` also mounts a `/v1/integrations/*` router (the same
surface, in Python). It is the reference implementation and is used by the
backend test suite, but it is **not** the deployed path in this free-tier setup
— the edge function is. If you later stand up the Python API on a host, both
surfaces behave identically; keep them in sync (recorded as TD-019).
