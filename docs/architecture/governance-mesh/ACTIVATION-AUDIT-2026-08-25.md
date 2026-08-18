# Agentic Mesh — activation audit, 2026-08-25

**Verdict before this audit: the mesh had never executed.** 27 agents in
`agent_registry`, 10 sentinels written, a deployed and ACTIVE
`governance-dispatcher` edge function, an ARCHITECTURE.md describing hourly
guarantees — and `agent_executions` / `governance_events` both holding **zero
rows**. "Always-on" was a description of intent, not of behaviour.

All findings below were verified by query against the live project
(`vhparvughsygyknblkzt`), not read from files.

## Root causes (four, each independently fatal)

| # | Defect | Evidence | Fix |
|---|---|---|---|
| 1 | `pg_cron` was never installed, so both the mesh sweep schedule (`20260816000001` §5) and the integration enqueue (`20260825000001` §6) took their guarded no-op path | `pg_extension` had no `pg_cron`; `cron.job` did not exist | `20260825000004` — extension created, both schedules re-run; verified `mesh-sentinels-sweep` (*/10) and `daily-integration-sync` (02:00 UTC) active |
| 2 | The dispatch trigger POSTed the event row **bare**; the edge function reads `body.record` (Supabase DB-webhook envelope). Every dispatch answered `400 {"error":"no-record"}` and the event stayed `pending` forever | `net._http_response` showed 400 `no-record` on every attempt | `20260825000005` — trigger now sends `{type, table, schema, record}` |
| 3 | No `governance_dispatcher_key` in vault, so the `Authorization` header was empty. Survivable while `verify_jwt=false`; fatal the moment a redeploy flips it on (which it did) | `vault.secrets` count = 0 | anon-role JWT stored as `governance_dispatcher_key` (grants no data access; RLS still applies) |
| 4 | `mesh_agent_state` and `mesh_model_fingerprints` from the fleet migration were never applied live, so every heartbeat and ChangeDetection write failed | `to_regclass` null for both | Applied 2026-08-25; now 40 heartbeat rows + 16 fingerprints |

## Agent-level defect: fake success inside the mesh itself

The deployed dispatcher's three agents targeted a schema that does not exist —
`risks.title/org_id/category/status`, `hitl_reviews.reason/created_by`,
`notifications.body/severity` — **and did not check the supabase-js error**.
Result: `agent_executions` recorded `succeeded` while zero rows landed. The
platform's own "never fake success" rule, violated by the component that
enforces governance.

Corrected (dispatcher v4): agents write live column names, set `tenant_id`
explicitly (the resolver returns NULL under the service role), carry
provenance (`source='auto-agent'`, `auto_generated=true`, `source_event_id`),
and **return `failed` with the database's message** when an insert is
rejected. `notifications.type` turned out to be CHECK-constrained to a
severity vocabulary (`info|success|warning|error|critical`), not an event
name — the event name now travels in `source_module`.

## End-to-end proof (live, 2026-08-25)

`MODEL_REGISTERED` for *Customer Support Copilot* (riskTier 1, CRITICAL):

```
event   MODEL_REGISTERED  status=completed
agents  RiskAssessmentAgent=succeeded, HITLAgent=succeeded, NotificationAgent=succeeded
writes  risks +1 (source=auto-agent)   hitl_reviews +1   notifications +1
http    200
```

Sentinel sweep (manual invocation, demo org): 6/10 succeeded on first run and
emitted 11 real governance events (DRIFT_DETECTED ×2, RISK_DETECTED ×7,
CONTROL_GAP_FOUND); heartbeats and fingerprints persisted.

## Remaining: 4 sentinels drifted from the live schema

Repaired in `supabase/functions/mesh-sentinels/index.ts` (committed) —
**deployment of that file is still pending**, so these four continue to fail
on live until it ships:

| Sentinel | Drift | Repair in repo |
|---|---|---|
| PolicyEnforcement | `trust_traces` does not exist on this project | Missing-table now yields `skipped` with an honest reason, not a permanent red `failed` |
| DataLineage | `datasets.linked_models` → actual column is `used_in_models` | Column corrected |
| IncidentTriage | `incidents` has no `title`/`assignee`/`detected_at`/`affected_users_count` | Uses `description`, `detected_date`/`occurred_date`, `affected_persons`; triage sets severity only (there is no assignee column) |
| Reporting | `notifications.tenant_id`/`notification_type`/`entity_type` do not exist | Uses `org_id`, `source_module='mesh-digest'`, `type='info'` |

**Next action:** deploy `mesh-sentinels` from the repo file (the payload
exceeds what is comfortable to hand-assemble in a tool call; use
`supabase functions deploy mesh-sentinels` from a checkout). Re-run the sweep
and expect 10/10 succeeded-or-skipped.

## Lesson for the review process

Three separate claims in this repo asserted the mesh was production-ready. All
three were written from the code, none from the database. The rule already
recorded for TD-001 applies here too and is now proven twice: **a verification
claim must cite the query and the context it ran in.** Deployed ≠ running;
registered ≠ executing; `succeeded` in a log means nothing if the write path
never checked its error.
