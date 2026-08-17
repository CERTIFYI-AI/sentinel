# Mesh activation — always-on sweeps and server-side cascade

**Honest status:** the 10 sentinels, the event bus, the telemetry ledger
(`governance_events` / `agent_executions` / `mesh_agent_state`) and the
GovernanceMesh page are fully wired and org-scoped. Two pieces need a
**live-database step** that a migration cannot supply by itself, because they
depend on the project's own Functions URL:

## 1. Always-on sweeps (pg_cron → mesh-sentinels edge function)

The fleet migration schedules the 10-minute sweep **only when**
`app.settings.supabase_functions_url` is set — that GUC is not provisioned
anywhere in the repo, so on a fresh project the cron block is a silent no-op
and sweeps run only on demand from `/governance-mesh`.

Activate (one time, live DB, as postgres):

```sql
alter database postgres
  set app.settings.supabase_functions_url = 'https://<project-ref>.functions.supabase.co';
```

then apply `supabase/migrations/20260819000005_mesh_cron_activation.sql`
(idempotent — safe to re-run; it re-attempts the schedule now that the GUC
resolves). Verify with `select jobname, schedule from cron.job;`.

## 2. Server-side cascade (governance_events → governance-dispatcher)

`mesh-sentinels` inserts events with `status='pending'`; the
`governance-dispatcher` edge function consumes them, but it is a **Database
Webhook** target and no webhook is registered by migrations. Register it in
the Supabase dashboard (Database → Webhooks): table `governance_events`,
events `INSERT`, target `https://<project-ref>.functions.supabase.co/governance-dispatcher`.

Until both steps are done, treat the mesh as **on-demand**: client sweeps from
the GovernanceMesh page and the browser-side cascade (INCIDENT_CREATED,
MODEL_REGISTERED emitters) work with no further setup.
