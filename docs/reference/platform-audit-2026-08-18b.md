# Platform re-audit — what the morning's findings actually closed

Second audit of 2026-08-18, against `claude/agentic-mesh-architecture-d6y5re`
@ `bb98c62`, which contains `main` @ `1a55d90`.

Companion to [`platform-audit-2026-08-18.md`](platform-audit-2026-08-18.md).
That audit raised ten findings; five commits landed on `main` in the hours
after, two of them naming those findings directly. **This audit checks whether
they closed, and audits the surface those commits added.**

**Method.** Same as before, so the numbers are comparable: every migration
applied in order to a **real PostgreSQL 16** behind a platform shim that
creates no application table, then the code measured against the resulting
schema. Every "closed" claim below was re-run, not read off a commit message.

**Scale now:** 150 migrations · 255 tables · 903 policies · 249 foreign keys ·
10 edge functions · 87 services · 94 module docs · 129 menu destinations.

---

## Verdict

**The architecture moved further than the findings did.** In one working day
the backend went from an unhosted FastAPI app, to Fly, to deleted — replaced by
a Supabase Edge Function and a scheduled GitHub Actions job. That was the right
call for a no-budget deployment and it is well built.

Against that, of the ten findings:

| | Finding | Status |
|---|---|---|
| **F0** | Seven tenant tables readable across orgs | **Closed** |
| **F1** | From-zero replay halts at migration 97 of 146 | **Closed** |
| **F2** | Thirteen create paths rejected by their own RLS | **4 of 13** |
| **F3** | `ai_models` / `use_cases` / `datasets` unaudited | **Open, unchanged** |
| **F4** | Tables read that no migration creates | 11 → **9** |
| **F5** | Three tables with no RLS | **Open, unchanged** |
| **F6** | Entity links with no foreign key | 40 → **41** |
| **F7** | Modules isolated both ways | 12 → **9** |
| **F8** | Error states missing | Not re-measured |
| **F9** | Smaller items | Partly addressed |

Two findings closed properly. One was closed against the *live* database and
therefore only closed a third of itself. Four are untouched. And the
architecture move introduced four new issues of its own, one of which is live
right now.

---

## F1 · Closed — and closed properly

`a37b0fb` ("the repo can build its own database from zero (audit F1)") does
exactly what it says:

```
before:  applied=138  failed=8   (halted at migration 97 of 146)
after:   applied=150  failed=0
```

Every migration now applies to an empty PostgreSQL 16. The `incidents` /
`risks` / `vendors` / `frameworks` text-vs-uuid split, the cascade through
`replay_repair.sql`, the unguarded `assets.tenant_id` statement — all resolved.
This is the single most valuable fix of the day: the repo can now stand up its
own database, which it could not do this morning.

## F0 · Closed

`20260830000003` shipped in #85. Whole-schema recheck on the fresh replay: the
only permissive `USING (true)` policies left for `authenticated` are
`emission_factors`, `integration_catalog` and `policy_templates` — all three
genuinely global reference data, none of which has an `org_id` column at all.

**Still open, and it is the part that matters:** TD-000's regression query is
still a sweep somebody remembers to run, not a gate. The defect has now shipped
twice. Nothing stops a third.

---

## F2 · Only 4 of 13 — **P0, still reproducible**

`e67e519` is titled *"F2 create-path repair — org_id defaults on the live
org_id-bearing tables"*. The phrase **"on the live"** is the whole story: the
fix was made against the live database's shape, and nine of the thirteen tables
this repo creates still have no default.

| Fixed (4) | Still no `org_id` default (9) |
|---|---|
| `api_keys`, `eval_techniques`, `model_dna`, `model_lifecycle_stages` | `use_cases`, `datasets`, `ai_impact_assessments`, `guardrail_rules`, `prompt_registry`, `trust_policies`, `webhook_endpoints`, `consent_records`, `maturity_assessments` |

Re-run on the fresh replay, with a resolved organisation, exactly what the
services send:

```sql
insert into public.use_cases (name) values ('probe A');
   ERROR:  new row violates row-level security policy for table "use_cases"

insert into public.datasets  (name) values ('probe B');
   ERROR:  new row violates row-level security policy for table "datasets"
```

Byte-identical to the morning's finding. **Create a use case, create a dataset —
both still fail**, and `use_cases` is one of the two shared id-spaces CLAUDE.md
names.

Two of the nine are `NOT NULL` (`consent_records`, `maturity_assessments`), so
those fail on the constraint before RLS even runs.

**Fix:** one migration adding `DEFAULT current_user_org_id()` to the nine. The
pattern is already in the tree four times over.

---

## F3 · Untouched — **P0**

Nothing changed. Measured again across the current 129 destinations:

```
write-capable destinations          93
  logAction only                    40
  DB audit trigger only             15
  both                              15
  NEITHER                           23   ← unchanged
```

And the three that matter most, re-verified:

```
ai_models   triggers=0   modelService.ts    logAction calls: 0
use_cases   triggers=0   useCaseService.ts  logAction calls: 0
datasets    triggers=0   datasetService.ts  logAction calls: 0
```

Registering, re-tiering or deleting an AI model still leaves no audit record
with an actor, in a product that sells EU AI Act Art. 12 alignment. `fn_audit_trigger`
covers 13 tables; attaching it to these three is a three-line migration.

---

## F4 · 11 → 9, but one is new

Resolved: `realtime_alerts` (its migration now applies, via F1) and
`sentinel_roles`. Still absent, and one addition:

| Table | Read by | Note |
|---|---|---|
| `roles` | `supabase-access-control.ts` | **live** Roles Management screen |
| `user_departments` | `supabase-access-control.ts` | **live** Users / Departments screens |
| `knowledge_graph` | `knowledgeGraphAgent.ts`, `impactAnalysisAgent.ts` | **new to this list** — two agents read a table no migration creates |
| `bia_processes`, `identities` | `resilienceService.ts` | known baseline gap |
| `profiles`, `governance_alerts`, `evidence_attachments`, `user_org_memberships` | various | disabled or dead paths |

`knowledge_graph` is worth separating out: the previous audit recorded it as an
orphan the *dashboard* read; it is now read by two **agents**, which act
autonomously. An agent querying a table that does not exist fails silently
inside a sweep rather than in front of a user.

## F5 · Unchanged

`rbac_permissions`, `regulatory_change_events`, `regulatory_source_monitors`
still carry no RLS and no scoping column. Either state in a module doc that
they are deliberate global reference data — as `integration_catalog` does — or
scope them.

## F6 · 40 → 41

Three columns gained foreign keys (`guardrail_events.policy_id`,
`live_traces.policy_id`, `post_market_events.incident_id` — the ones the
previous audit measured as 100% broken), and four new unconstrained ones
arrived with the new migrations. Net: one worse. Total FKs rose 233 → 249, so
constraint discipline is improving overall while entity links specifically are
not.

## F7 · 12 → 9 isolated

`/mcp-gateway`, `/mcp-gateway/servers` and `/mcp-gateway/tools` now link to
agents, HITL and each other (this branch). The other nine are unchanged.

## F8 · Not re-measured

The error-state sweep was not re-run in this pass. Treat the morning's figure
(56 of 120) as the last known state, not as current.

---

## New findings on the new surface

The edge function is well built — JWT verified through `auth.getUser()`, org
resolved from `user_profiles` and never from the body, `sync` scoped by
`org_id`, connect gated on `adapter_status`, credential-encryption failures
returned without echoing the cause. The crypto interop test pinning Web Crypto
against the Python blob is exactly the right instinct. What follows is what the
move cost.

### N1 · The evidence pipeline's scheduler is the thing that is currently broken — **P1**

`evidence-worker.yml` runs the sync worker as a **scheduled GitHub Actions
job**. Every Actions job in this repository has failed all day with
`runner_id: 0`, `started_at == created_at` and no runner ever assigned —
including on `main`. The pipeline's clock now depends on the one piece of
infrastructure that is, at the time of this audit, unable to run anything.

The workflow itself is careful (secrets-guarded, skips cleanly when unset,
drain-once so it cannot hang). The concern is not the code; it is that
collection and CI now share a single point of failure, and it is currently
failing. `pg_cron` still enqueues independently, so jobs will queue and wait —
nothing is lost, but nothing is collected either.

### N2 · Credential validation moved from immediate to hours-later — **P2**

The removed FastAPI endpoint validated submitted credentials against the
adapter's own model and returned a clean 400: *"Credentials do not match what
the aws adapter requires."* The edge function cannot do this — the adapters are
Python and it is Deno — so a wrongly-shaped credential is now accepted,
encrypted, stored, and discovered by the worker on the next run, surfacing as
`last_run_error` rather than as a form error while the operator is still
looking at the form.

This is inherent to splitting the languages, not an oversight. It is worth
either publishing the credential field contract in a form both sides read, or
saying plainly in the connect UI that the shape is verified on first sync.

### N3 · `sync` does not gate on adapter status, `connect` does — **P3**

`connect` refuses a slug whose `adapter_status` is not `available`/`beta`.
`sync` checks only that `catalog_slug` is non-null. An integration whose
product was later demoted can therefore queue a job the worker will refuse,
burning the retry budget. One `.in('adapter_status', …)` closes it.

### N4 · "Continuous" is a daily batch — **P3, naming**

`pg_cron` enqueues at 02:00 and the Actions worker drains daily. That is a
sound, free design — and it means the shortest interval between a control
breaking in a cloud account and the platform noticing is **24 hours**. For a
product positioned on continuous monitoring, the interval belongs in the UI
next to the posture, not only in a workflow file.

### N5 · The gateway's HTTP surface has no host — **P2, this branch**

Raised on PR #86 and unresolved: `POST /v1/gateway/authorize` is a FastAPI
route, and the FastAPI deployment path was deleted by `1a55d90`. The decision
rules (`sentinel/gateway/policy.py`) are pure and independently useful; the
endpoint is homeless. Recommended resolution is to move the decision into a
`SECURITY DEFINER` Postgres function — the pattern `audit_client_event` already
uses for client-initiated, database-written evidence — which needs no host at
all and makes the decision and its record atomic.

---

## What to fix first

1. **F2's remaining nine** — one migration, the pattern already exists four
   times, and it unbreaks "create a use case" and "create a dataset".
2. **F3** — attach `fn_audit_trigger` to `ai_models`, `use_cases`, `datasets`.
   Three lines, and it closes an Art. 12 gap on the core registries.
3. **N1** — decide whether the evidence clock should depend on Actions. If the
   quota problem is not short-lived, `pg_cron` calling an edge function
   directly (the pattern `mesh-sentinels-sweep` already uses) removes the
   dependency entirely.
4. **F0's missing gate** — make TD-000's regression query run on every
   migration. It has shipped twice; a third time is a matter of when.
5. **F4's `knowledge_graph`** — either create the table or stop two agents
   querying it.

## Reproducing

```bash
initdb -D "$PGDATA" --auth=trust && pg_ctl -D "$PGDATA" -o "-k /tmp -p 5433" start
psql -h /tmp -p 5433 -U postgres -f <shim.sql>       # auth schema, roles, cron stub
for f in supabase/migrations/*.sql; do
  psql -h /tmp -p 5433 -U postgres -v ON_ERROR_STOP=1 -f "$f"; done   # 150/150
```

The shim is a harness: it creates no application table and no application
function.
