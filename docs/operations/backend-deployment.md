# Backend deployment (Fly.io)

**Status:** ready to deploy — needs one repository secret and a one-time app
setup (below). **Owner:** Platform. **Raised:** 2026-08-18.

This runbook deploys the **Python backend** — the FastAPI API *and* the
evidence-sync worker — to [Fly.io](https://fly.io). Until this is done, the
dashboard (Cloudflare Worker) and database (Supabase) are live but the backend
is not, so `POST /v1/integrations/connect` has no host and no evidence is ever
collected. See [`continuous-evidence-roadmap.md`](../reference/continuous-evidence-roadmap.md)
for why this is Phase 0.

## What gets deployed

One Fly app, two processes off a single image ([`fly.toml`](../../fly.toml)):

| Process  | Command                                            | Purpose                                                             |
| -------- | -------------------------------------------------- | ------------------------------------------------------------------- |
| `web`    | `uvicorn sentinel.api.main:app --host 0.0.0.0 ...` | Serves the API, incl. `/v1/integrations/connect\|sync\|available`.  |
| `worker` | `python -m sentinel.integrations.worker`           | Claims `background_jobs`, runs adapters, writes findings + evidence. |

The image installs the `[integrations]` extra ([`Dockerfile`](../../Dockerfile))
so the worker has its provider SDKs (`boto3`, `PyGithub`).

## Runtime secrets

Set these on the Fly app (they live in Fly, never in the repo):

| Secret                     | Used by                                   | Value                                                            |
| -------------------------- | ----------------------------------------- | ---------------------------------------------------------------- |
| `SENTINEL_SECRET_KEY`      | config (`config.py`, ≥32 chars)           | `openssl rand -hex 32`                                            |
| `SENTINEL_CREDENTIALS_KEY` | credential crypto (`crypto.py`, AES-256)  | `openssl rand -base64 32` — base64 that decodes to **32 bytes**  |
| `DATABASE_URL`             | API tenant resolver + integrations `_db()` | Supabase **pooler** DSN (service role)                          |
| `SENTINEL_DATABASE_URL`    | sync worker (`worker.py`)                  | the **same** DSN as `DATABASE_URL`                               |

`DATABASE_URL` and `SENTINEL_DATABASE_URL` are the same connection string — the
two halves just read different variable names. Use the service-role pooler URI
from the Supabase dashboard (Project → Database → Connection pooling). The
worker connects with the service role by design and org-checks every read
against the job payload, because RLS does not apply to that role.

> **Never** commit any of these. `SENTINEL_CREDENTIALS_KEY` decrypts stored
> integration credentials; rotating it makes existing credential blobs
> undecryptable, so treat it as long-lived and back it up securely.

## One-time setup

Run locally with `flyctl` authenticated to your personal org
(<https://fly.io/dashboard/personal>):

```bash
# 1. Create the app from the committed fly.toml (edit `app`/`primary_region` first
#    if you want; match the region to your Supabase project for lowest latency).
fly launch --no-deploy --copy-config --name certifyi-sentinel

# 2. Set the runtime secrets (one DSN, used for both variables).
DSN='postgresql://postgres:<password>@<host>:6543/postgres'
fly secrets set \
  SENTINEL_SECRET_KEY="$(openssl rand -hex 32)" \
  SENTINEL_CREDENTIALS_KEY="$(openssl rand -base64 32)" \
  DATABASE_URL="$DSN" \
  SENTINEL_DATABASE_URL="$DSN"

# 3. First deploy.
fly deploy

# 4. Point the dashboard at the API. Set this Cloudflare env var to the Fly URL:
#    VITE_SENTINEL_API_URL = https://certifyi-sentinel.fly.dev
```

## CI deploys after setup

[`.github/workflows/deploy-backend.yml`](../../.github/workflows/deploy-backend.yml)
redeploys on every push to `main` that touches `sentinel/**`, `Dockerfile`,
`pyproject.toml`, or `fly.toml`. Add one repository secret:

- `FLY_API_TOKEN` — create with `fly tokens create deploy`.

Until it exists the workflow **skips with a notice** (it does not fail), so it
never reds `main` before Fly is wired up.

## Verify the loop is closed

```bash
# API is up and serves the integrations surface:
curl -s https://certifyi-sentinel.fly.dev/api/health
curl -s https://certifyi-sentinel.fly.dev/v1/integrations/available   # -> {"slugs":[...]}

# Worker is polling (should log "integration-worker-<pid> started"):
fly logs --app certifyi-sentinel | grep integration-worker

# End-to-end: connect an integration in the UI, then confirm the row was
# promoted configuring -> connected on first successful sync (the fix that lets
# the daily cron re-enqueue it). In Supabase SQL editor:
#   select catalog_slug, status, last_run_status, last_sync_at
#   from public.integrations where is_deleted = false order by updated_at desc;
```

A newly connected integration should reach `status = 'connected'`,
`last_run_status = 'success'` within a minute. If it stays `configuring`, the
worker is not running or cannot reach the database — check `fly logs`.

## Cost note — "free" is not quite free

Fly bills allocated machine-time. The `web` machine is set to **suspend when
idle** (`auto_stop_machines = "suspend"` in `fly.toml`), so it costs almost
nothing between requests. The `worker` is a continuous poll loop, so it runs
24/7 at the smallest size — a few USD/month, not zero.

**Cheaper alternative** if 24/7 is unwanted: delete the `worker` process from
`fly.toml` and instead run it as a scheduled Fly Machine (or a small external
cron) that starts, drains the queue, and exits — e.g. every 15 minutes. The
worker's `run()` loop already exits cleanly on `SIGTERM`, so a
start-drain-stop invocation is safe. Collection cadence then equals the
schedule interval instead of near-real-time. Record the choice in the roadmap.
