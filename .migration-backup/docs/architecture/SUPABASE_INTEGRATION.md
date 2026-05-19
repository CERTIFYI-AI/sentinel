# Supabase Backend Integration

How Sentinel uses Supabase (Postgres + Auth + Realtime + Storage + Edge Functions) as its primary backend. This document is the contract between `dashboard/src` and the database.

## What already exists in the repo
| File | Role |
|---|---|
| `dashboard/src/lib/supabase.ts` | Singleton `createClient` with env-driven URL/anon key |
| `dashboard/src/lib/dataSource.ts` | `fetchDB` / `mutateDB` helpers with fallback to mock when env is missing |
| `dashboard/src/store/authStore.ts` | Zustand store bound to `supabase.auth` (session, user, org claims) |
| `dashboard/src/hooks/useRealtimeInvalidation.ts` | Subscribes to 9 tables and invalidates React-Query caches on `postgres_changes` |
| `all_controls_seed.sql` | ISO 42001 / NIST control catalog seed |
| `data/sentinel-seed-data.sql` | Demo org/users/models seed |

**Conclusion:** wiring exists; we only need to (a) publish the schema DDL, (b) enable RLS per module, (c) add missing tables, (d) register edge functions and realtime channels.

## Environment
```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...   # server-side only (edge functions, CI seeds)
```
These are additive to the existing `.env.example`; do **not** remove the legacy `POSTGRES_*` / `DATABASE_URL` values — the Python worker (`gen_seed.py`, `convert_seed.py`) still uses them for offline seeding.

## Schema layout (one file per domain in `supabase/migrations/`)
```
supabase/
  migrations/
    0001_core_identity.sql          # orgs, users, roles, rbac_bindings
    0002_frameworks_controls.sql    # frameworks, controls, control_tests
    0003_policies.sql               # policies, policy_versions, policy_evaluations
    0004_models_aibom.sql           # models, aibom_components, prompt_versions
    0005_risk_tiering_dpia.sql      # risk_tiers, dpia_assessments
    0006_risk_incidents.sql         # risks, incidents, forensics_entries, remediation_tasks
    0007_bias_redteam_evals.sql     # bias_audits, red_team_runs, evals, benchmarks
    0008_data_privacy.sql           # datasets, ropa_records, tia_records, dsr_actions
    0009_vendors.sql                # vendors, vendor_assessments
    0010_agents_prompts.sql         # agents, agent_events
    0011_approvals.sql              # approvals (polymorphic)
    0012_evidence_audit.sql         # evidence, audit_log
    0013_trust_narrative.sql        # trust_scores, narratives
    0014_notifications.sql          # notifications, integration_events
    0015_training_ethics_esg.sql    # training_completions, ethics_reports, esg_metrics
    0016_views_matviews.sql         # executive dashboards, knowledge graph edges
    0100_rls_policies.sql           # RLS for every table (see below)
    0200_functions_triggers.sql     # see FUNCTIONAL_ACTIVATION.md
```

## Canonical table conventions
Every table includes:
```sql
id            uuid primary key default gen_random_uuid(),
org_id        uuid not null references orgs(id) on delete cascade,
created_at    timestamptz not null default now(),
updated_at    timestamptz not null default now(),
created_by    uuid references users(id),
updated_by    uuid references users(id),
metadata      jsonb not null default '{}'::jsonb
```
All soft-deletable tables also carry `deleted_at timestamptz`.

## Polymorphic join tables
```sql
evidence (
  id uuid pk,
  org_id uuid,
  entity_type text check (entity_type in (
    'model','policy','control','incident','risk','dpia','bias_audit',
    'red_team_run','eval','vendor','dsr','approval','filing','training'
  )),
  entity_id uuid not null,
  kind text,                      -- 'document','screenshot','log','attestation','hash'
  uri text,                        -- supabase storage path or external URL
  sha256 text,
  chain_prev uuid references evidence(id),  -- evidence chain
  ...
);

approvals ( entity_type, entity_id, decision, approver_id, ... );
audit_log ( entity_type, entity_id, action, actor_id, diff jsonb, ... );  -- append-only
```

## Row-Level Security (RLS) template
Every table follows the same RLS shape:
```sql
alter table <t> enable row level security;

create policy "tenant_isolation_select" on <t>
  for select using ( org_id = auth.jwt() ->> 'org_id' );

create policy "tenant_isolation_write" on <t>
  for all using  ( org_id = auth.jwt() ->> 'org_id' )
           with check ( org_id = auth.jwt() ->> 'org_id' );

create policy "role_guard_write" on <t>
  for insert with check ( has_role(auth.uid(), '<module>:write') );
```
`has_role(user_id, permission)` is a SECURITY DEFINER function that joins `rbac_bindings → role_permissions`.

Sensitive tables (audit_log, evidence) are `for insert only` from client; `update`/`delete` are blocked (append-only). Service role bypass is used only in edge functions.

## Supabase Auth → app claims
- Users authenticate via Supabase Auth (email + MFA, SSO via SAML/OIDC for enterprise).
- Custom JWT hook adds: `org_id`, `roles[]`, `tier` into the token so RLS + UI can read it.
- `authStore.ts` already maps session → user/org; extend it to expose `roles[]` to `<RoleGuard>` components.

## Storage buckets
| Bucket | Content | Access |
|---|---|---|
| `evidence` | PDFs, screenshots, logs | signed URLs only, 7-year retention |
| `exports` | Regulator filings, audit packages | signed URLs, 90-day TTL |
| `prompts` | Prompt Registry artifacts | RLS via org_id prefix |
| `models` | AIBOM manifests, model cards | RLS via org_id prefix |
Storage path convention: `<bucket>/<org_id>/<entity_type>/<entity_id>/<filename>`.

## Realtime channels (already partially live)
`useRealtimeInvalidation.ts` subscribes to: `notifications, guardrails, hitl_queue, risks, models, incidents, controls, bias_audits, audit_log`. Extend this list to include: `approvals, evidence, policies, dpia_assessments, red_team_runs, vendor_assessments, remediation_tasks, trust_scores`.

## Edge Functions (Deno) — see FUNCTIONAL_ACTIVATION.md
Path: `supabase/functions/<name>/index.ts`. Each function is tenant-aware (reads `org_id` from JWT) and uses the service role only for cross-tenant system jobs.

## Wiring `dataSource.ts`
Replace any remaining mock paths with the pattern already used in the file:
```ts
export async function fetchDB<T>(table: string, q: QueryOpts): Promise<T[]> {
  const { data, error } = await supabase.from(table).select(q.select ?? '*')
    .match(q.filter ?? {}).order(q.orderBy ?? 'created_at', { ascending: false });
  if (error) { console.warn('[fetchDB]', error); return getFallback<T>(table); }
  return data as T[];
}
```
`getFallback` continues to serve the demo JSON in `dashboard/src/data/` so the UI never breaks when Supabase is offline — critical for the brand-consistent live demo.

## CI / migration workflow
```
supabase db push           # apply migrations to linked project
supabase gen types typescript --linked > dashboard/src/types/db.ts
supabase db seed --file all_controls_seed.sql
supabase db seed --file data/sentinel-seed-data.sql
```
Add a GitHub Action `.github/workflows/supabase.yml` that runs `supabase db push` on merges to `main` with `SUPABASE_ACCESS_TOKEN` + `SUPABASE_DB_PASSWORD` secrets.

## Non-goals
- No schema or UI changes to existing tables/components.
- No brand, color, or Outfit-font changes.
- No credential capture in chat — keys are set via `supabase secrets set` or the dashboard.
