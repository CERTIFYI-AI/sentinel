# Continuous / autonomous evidence — roadmap

**Raised:** 2026-08-18 · **Owner:** Platform + Compliance · **Status:** Phase 0
in progress.

Sentinel already has the *parts* of a continuous, autonomous evidence system:
an event bus, the `mesh-sentinels` edge function, five `pg_cron` schedules, a
locking job worker, cloud evidence adapters, and `governance_events` on the
Realtime publication. Almost nothing is missing conceptually. What was missing
is that **the loop never closed** — it broke in four concrete places. This doc
records what was verified against the code, what this pass fixed, and the
phased plan for the rest. It complements
[`platform-audit-2026-08-18.md`](platform-audit-2026-08-18.md) and the deploy
runbook at [`../operations/backend-deployment.md`](../operations/backend-deployment.md).

## The four breaks (all verified in code)

| # | Break | Evidence | State |
| - | ----- | -------- | ----- |
| ① | **No backend deployment.** The Dockerfile builds the API but nothing deploys it, so `POST /v1/integrations/connect` has no host. | `.github/workflows/*` deployed only the dashboard + migrations. | **Fixed (free tier).** connect/sync/available reimplemented as the `integrations-connect` Supabase Edge Function ([`supabase/functions/integrations-connect/`](../../supabase/functions/integrations-connect/index.ts)); the frontend calls it via `supabase.functions.invoke`. No paid host. Fly was dropped (a 24/7 worker is not free). |
| ② | **No worker process.** `sentinel/integrations/worker.py` has `run()`/`main()`; nothing invoked them. `docker-compose.yml`'s only worker is a *different*, older Celery engine (`sentinel.compliance.engine`). | — | **Fixed (free tier).** New `run(drain=True)` mode + scheduled GitHub Actions job ([`evidence-worker.yml`](../../.github/workflows/evidence-worker.yml)) drains the queue daily and exits — free Actions minutes, no 24/7 process. |
| ③ | **Status handshake broken.** `connect()` writes `status='configuring'`; the worker updated `last_sync_at`/`last_run_status`/`health` but **never `status`**; both cron schedules enqueue only `where i.status='connected'`. Nothing promoted `configuring → connected`, so collection ran **once** at connect and never recurred. | `integrations/api.py:174`, `worker.py:157-165`, `20260825000001.sql:239`, `20260825000006.sql:68` | **Fixed** — `worker.py` now promotes `configuring → connected` on first successful sync (never overwriting a terminal state). |
| ④ | **Router fork (found this pass).** `/v1/integrations/*` was mounted **only** on `sentinel/proxy.py`'s app, but the container runs `sentinel.api.main:app`, which never mounted it — so even once deployed, connect would 404. | `proxy.py:213` had it; `sentinel/api/main.py` did not. | **Fixed** — router mounted in `main.py` (verified via the app's OpenAPI schema), ahead of the catch-all frontend proxy that would otherwise swallow its GET routes. |

⑤ **The schedules aren't applied.** The five `cron.schedule` calls
(`mesh-sentinels-sweep` @10m, `daily-integration-sync` @02:00, …) live in
migrations that have not run on live. They apply the moment **Deploy
Migrations** runs to completion — which is gated on the three Supabase secrets
the user must add (tracked separately). No code change needed here; listed so
the dependency is explicit.

⑥ **Payload-contract mismatch (found while building the free path).**
`process_job` read `payload["org_id"]` and `payload["integration_slug"]`, but
**both** connect surfaces enqueue only `{integration_id, catalog_slug}` — so the
worker would `KeyError` on the very first real job. **Fixed:** the worker now
treats the `integrations` row as the authority, deriving `org_id` and slug from
it keyed only by `integration_id` (which also keeps the org boundary intact — a
job cannot name a different org than the row it points at).

## Unnecessary surface — verified, and the decision for each

Three different kinds; only the first is a clean delete:

- **Dead code.** `useCommitteesData.ts` and the `ViewAsRole` component have
  **zero consumers** (verified by grep) — **deleted this pass**. The
  `viewAsRole` slice in `sessionStore.ts` is now unreferenced too; left in
  place (removing persisted-store shape is a behavior change) — a one-line
  follow-up.
- **Wire-or-remove (NOT deleted).** `ContextualAlert.tsx` and
  `EvidenceAttachments.tsx` are only barrel-re-exported with no consumer *yet*.
  `EvidenceAttachments` implements the platform's evidence-chain principle —
  deleting a built-but-unwired capability we actually want is the wrong call.
  Decision: **wire `EvidenceAttachments`** into a governed record's detail view
  (an assessment or a control) so the evidence chain is reachable from the UI;
  **remove `ContextualAlert`** only if no module adopts it next pass.
- **Over-fragmentation (a product decision, not a code cleanup).** 134 menu
  destinations over ~91 distinct backing tables; 43 tables are shared by more
  than one destination. The worst clusters are tabs promoted to menu items:
  Security reports (10 destinations over 2 tables), Evals (6), Incidents (5),
  MCP Gateway (3). Collapsing those four clusters alone takes the menu from 134
  to ~100 destinations **without removing a capability**. This is an
  information-architecture change that touches the sidebar, routes, and the
  command palette, and it must pass the four review gates — so it is **not**
  executed unilaterally. Proposed as Phase 3 work, one cluster at a time, each
  with a before/after and a redirect for the removed routes.

> What code cannot tell us — and this roadmap will not pretend to: whether
> anyone *uses* a given module. Duplication, deadness and unreachability are
> measurable; product value is not. The 12 isolated modules from the audit
> (`/compliance/drift`, `/continuity`, `/documents`, `/explainability`, …) are
> *unfinished*, not proven *unnecessary* — the decision for each is
> **interlink it or demote it**, and that needs a human.

## Phased plan

### Phase 0 — unblock (no new features until this executes), $0 infra

1. Deploy the `integrations-connect` **edge function** + wire the scheduled
   **evidence worker** — **runbook**:
   [`../operations/backend-deployment.md`](../operations/backend-deployment.md).
   *(code landed; needs `supabase functions deploy` + `SENTINEL_CREDENTIALS_KEY`
   on the function and `SENTINEL_DATABASE_URL`/`SENTINEL_CREDENTIALS_KEY` as
   Actions secrets.)*
2. Run **Deploy Migrations** to completion so the cron schedules and the
   evidence tables exist on live *(needs the three Supabase secrets).*
3. ③ status handshake, ⑥ payload contract — **done in code**; verify
   end-to-end after deploy (connect an integration, run the worker once, confirm
   it reaches `status='connected'`).
4. ④ router mount — **done in code** (the Python reference surface; the edge
   function is the deployed one).

Nothing below this line can execute until Phase 0 is live. Fly.io was dropped —
a 24/7 worker is not free; the drain-once GitHub Actions worker is.

### Phase 1 — continuous evidence

- Per-integration cadence instead of one nightly batch.
- Treat a finding's **status change** as the event (a `PASSED → FAILED`
  transition is the signal, not the finding's mere existence).
- More adapters — **Okta/Entra** and **Google Workspace** buy the most control
  coverage per adapter. (AWS adapter ships; wire real credentials.)

### Phase 2 — autonomous (mesh acts on evidence)

Let the mesh close the governance loop: a `FAILED` check → open or update the
linked risk → attach the finding as evidence → raise a HITL review where the
model's tier demands it.

**Prerequisites, both hard blockers:**

- **[TD-018](technical-debt.md#td-018)** — `ai_models`, `use_cases`,
  `datasets` are not audit-logged. An agent writing to them unattributably is
  *worse* than no agent under EU AI Act Art. 12. Fix first.
- **[TD-017](technical-debt.md#td-017)** — the `tenant_id`/`org_id` era split.
  Agents writing to the affected tables would be rejected by RLS exactly as the
  UI create-paths were.

### Phase 3 — realtime surface + IA consolidation

- Subscribe the GRC surfaces (risk, controls, assessments) to
  `governance_events` so posture changes appear without a refresh. Realtime is
  currently used in 9 files, all telemetry (traces, guardrails, mesh) — none of
  the GRC records.
- Collapse the over-fragmented menu clusters (above), one at a time, gated on
  the four review roles, each with route redirects so no link dead-ends.

## Review-gate status for this pass

- **QA/QC** — `tsc --noEmit` clean; `ruff` clean on changed Python; route mount
  proven via the app's OpenAPI schema; dead-code deletions proven zero-consumer
  by grep. No fake success introduced.
- **UI/UX** — N/A for the backend/deploy changes; the two deleted files had no
  UI surface. `EvidenceAttachments` wiring deferred to Phase 1 (recorded, not
  silently dropped).
- **Documentation** — this roadmap + the deploy runbook are part of the change;
  [TD-019](technical-debt.md#td-019) records the residual two-app router fork.
- **Compliance** — no evidence chain weakened; the status-handshake fix makes
  recurring collection actually happen, which *strengthens* Art. 12
  traceability. Autonomous writes remain gated on TD-018/TD-017.
