# Sentinel Database Reference

> Source of truth for the Postgres schema, multi-tenant isolation strategy, and RLS policy patterns powering the Sentinel platform.

This document describes the **production database** (Supabase Postgres, region `ap-southeast-1`) — its schema layout, tenant isolation contract, security helpers, and the operational runbooks for migrations, backfills, and security audits.

For migration history, see [`supabase/migrations/`](../supabase/migrations).
For the most recent QA baseline, see [`docs/audit/PHASE2_FULL_AUDIT.md`](audit/PHASE2_FULL_AUDIT.md).

---

## 1. Architecture Overview

Sentinel uses a **single-database, schema-isolated** design:

| Concern | Implementation |
|---|---|
| Multi-tenancy | Per-row tenant scoping via `org_id` (or `tenant_id`) column on every business table |
| Authorization | Postgres Row Level Security (RLS) policies enforced by Supabase Auth JWT claims |
| Identity | Supabase Auth (`auth.users`); per-user profile mirror in `public.user_profiles` |
| Real-time | Supabase Realtime subscribed to `public.*` tables; client invalidates TanStack Query cache on `postgres_changes` |
| Storage | Supabase Storage for evidence artifacts, policy attachments, model cards |
| Encryption | Postgres TDE at rest (Supabase-managed); AES-256 application-level on `keys_vault.secret_value` |

There is **no separate API tier**. The frontend (React/Vite, deployed to Cloudflare Workers as static assets) speaks directly to PostgREST through the Supabase JS client. RLS is therefore the **only** thing protecting tenant data — see §4.

---

## 2. Tenancy Model

### 2.1 Single org per user (current)

A user belongs to exactly one organization, captured by `public.user_profiles.org_id`:

```sql
CREATE TABLE public.user_profiles (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id  uuid NOT NULL REFERENCES public.organizations(id),
  role    text NOT NULL DEFAULT 'member',
  ...
);
```

The helper `public.current_user_org_id()` resolves the caller's `org_id` from `auth.uid()`:

```sql
CREATE OR REPLACE FUNCTION public.current_user_org_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT org_id FROM public.user_profiles WHERE user_id = auth.uid()
$$;
```

This is the canonical RLS predicate primitive. **All tenant policies must reference it** (or the legacy `get_org_id()` / `get_user_org_id()` aliases that delegate to the same lookup).

### 2.2 Tenant column conventions

Two column names are in use across the 144 live tables:

| Column | Type | Used by |
|---|---|---|
| `org_id` | `uuid` | Newer tables — agents, controls, frameworks, models, policies, notifications, incidents, audit_log, evidence_chain, etc. |
| `tenant_id` | `uuid` **or** `text` | Legacy/seed tables — assets, bia_processes, committees, departments, identities (UUID); risks, vendors, tasks, evidence, datasets, incidents, hitl_reviews, ethics_reports, training_courses, transparency_reports, bcp_plans, carbon_records, consent_records, keys_vault, model_arena_runs, policy_firewall_rules, red_team_findings, remediation_plans, supply_chain_attestations, attack_surface_assets, bias_audits (TEXT) |

When writing RLS predicates against `tenant_id`, **always cast the helper** to match the column type:

```sql
-- TEXT-typed tenant_id
USING (tenant_id = public.current_user_org_id()::text)

-- UUID-typed tenant_id
USING (tenant_id = public.current_user_org_id())
```

Mixing types causes `42883: operator does not exist: text = uuid`. See migration `20260428_phase2_p0_org_scoped_policies_tenant_id_text` for the production reference.

### 2.3 Future: multi-org membership

A future `public.org_members(user_id, org_id, role)` table (see [audit §3](audit/PHASE2_FULL_AUDIT.md)) will enable users to belong to multiple organizations. When that lands, `current_user_org_id()` will be parameterized by the active org from a JWT claim or session var, and RLS predicates will become `org_id IN (SELECT org_id FROM org_members WHERE user_id = auth.uid())`. No table change is required — only the helper.

---

## 3. Schema Layout

### 3.1 Core domain tables (selected)

| Domain | Tables |
|---|---|
| **Identity & access** | `user_profiles`, `organizations`, `roles`, `sentinel_roles`, `identities` |
| **Frameworks & controls** | `frameworks`, `framework_sections`, `controls`, `policies`, `policy_versions`, `policy_firewall_rules`, `policy_templates` |
| **Risk & compliance** | `risks`, `risk_register`, `audits`, `audit_findings`, `audit_log`, `compliance_calendar`, `compliance_events`, `compliance_scores`, `conformity_assessments`, `maturity_assessments` |
| **AI lifecycle** | `models`, `model_inventory`, `agents`, `bias_audits`, `model_arena_runs`, `red_team_campaigns`, `red_team_findings`, `explainability_reports`, `model_efficiency`, `ai_models`, `ai_impact_assessments` |
| **Evidence & data** | `evidence`, `evidence_chain`, `documents`, `document_versions`, `datasets`, `data_assets`, `attack_surface_assets` |
| **Operations** | `tasks`, `notifications`, `incidents`, `incident_workflow_steps`, `hitl_queue`, `hitl_items`, `hitl_reviews`, `approvals`, `exceptions`, `remediation_plans`, `bcp_plans`, `bia_processes` |
| **Governance** | `committees`, `departments`, `assets`, `event_cascade_links`, `guardrails`, `guardrail_rules`, `guardrail_events`, `live_traces`, `trust_policies`, `trust_traces` |
| **Privacy & ethics** | `consent_records`, `dsar_requests`, `ethics_reports`, `transparency_reports`, `carbon_records`, `supply_chain_attestations`, `keys_vault`, `api_keys` |

### 3.2 Helper functions

| Function | Returns | Purpose |
|---|---|---|
| `public.current_user_org_id()` | `uuid` | Caller's org from `user_profiles` |
| `public.current_user_permissions()` | `text[]` | Caller's permission strings for client-side gating |
| `public.is_org_admin()` | `boolean` | `role = 'admin'` shortcut for write policies |
| `public.get_user_role()` | `text` | RBAC role string |
| `public.global_search(p_tenant_id text, p_query text, p_limit int)` | `setof record` | Cross-table FTS scoped to a tenant |
| `public.handle_new_user()` | trigger | Auto-creates `user_profiles` row when `auth.users` insert fires |

All are `SECURITY DEFINER` with `search_path = ''` to prevent search-path hijacking.

### 3.3 Views

| View | Purpose |
|---|---|
| `public.users_with_details` | Join of `auth.users` + `user_profiles` for the team-management UI. Runs in `security_invoker` mode so RLS on the underlying tables is enforced against the calling user (not the view owner). |

> **Important**: any new view that references RLS-protected tables **must** be created with `WITH (security_invoker = true)`, otherwise the linter raises a `security_definer_view` ERROR.

---

## 4. RLS Contract

### 4.1 Default state

Every business table has RLS **enabled** at creation. A table without an explicit policy is therefore **deny-all** (only `service_role` bypasses). This is intentional — fail-closed beats fail-open.

The lookup tables `module_health`, `policy_templates`, and `sentinel_roles` are intentionally global (no `org_id`), and have permissive `USING (true)` SELECT policies for `public`/`authenticated`. Writes are restricted to `service_role`.

### 4.2 Policy template (per-tenant table)

```sql
-- Drop legacy always-true / role-broad policies first
DROP POLICY IF EXISTS my_table_auth_read ON public.my_table;
DROP POLICY IF EXISTS my_table_auth_write ON public.my_table;

-- Replace with org-scoped policy (UUID column)
CREATE POLICY my_table_org ON public.my_table
  FOR ALL TO authenticated
  USING      (org_id = public.current_user_org_id())
  WITH CHECK (org_id = public.current_user_org_id());

-- Service role bypass (always last, always TO service_role)
CREATE POLICY my_table_service_role ON public.my_table
  FOR ALL TO service_role
  USING (true) WITH CHECK (true);
```

For **TEXT**-typed `tenant_id` columns, append `::text` to the helper:

```sql
USING (tenant_id = public.current_user_org_id()::text)
```

### 4.3 Forbidden patterns

| Pattern | Reason | Detector |
|---|---|---|
| `USING (true)` on tenant tables | No isolation; any authenticated user reads all tenants | Supabase advisor `rls_policy_always_true` |
| `SECURITY DEFINER` view referencing tenant tables | View bypasses RLS | Supabase advisor `security_definer_view` |
| `SECURITY DEFINER` function without `SET search_path = ''` | Search-path hijack via mutable schemas | Advisor `function_search_path_mutable` |
| `EXECUTE` on `SECURITY DEFINER` function granted to `anon` | Pre-auth callers escalate via the function body | Advisor `anon_security_definer_function_executable` |
| Service-role policy mixed with `authenticated` `USING (true)` | The permissive policy short-circuits isolation — Postgres OR-combines permissive policies | Manual review |

### 4.4 Verification queries

Run these after any policy change:

```sql
-- Always-true policies remaining on tables with org_id/tenant_id (target: 0)
SELECT p.tablename, p.policyname, p.cmd, p.roles::text
FROM pg_policies p
WHERE p.schemaname = 'public'
  AND (p.qual = 'true' OR p.qual IS NULL)
  AND (p.with_check = 'true' OR p.with_check IS NULL)
  AND NOT (p.roles::text = '{service_role}')
  AND p.tablename IN (
    SELECT table_name FROM information_schema.columns
    WHERE table_schema='public' AND column_name IN ('org_id','tenant_id')
  );

-- Tables with RLS enabled but zero policies (allowed only for legacy CamelCase)
SELECT n.nspname, c.relname
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relrowsecurity = true
  AND n.nspname = 'public'
  AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename = c.relname);
```

The Supabase advisor (`Database → Advisors → Security`) automates both checks plus 8 others.

---

## 5. Migration Workflow

All schema changes flow through `supabase/migrations/` with the timestamp-prefixed convention:

```
supabase/migrations/20260428120000_phase2_p0_helper_functions.sql
supabase/migrations/20260428120100_phase2_p0_lock_security_definer_functions.sql
supabase/migrations/20260428120200_phase2_p0_fix_security_definer_view.sql
...
```

### 5.1 Local development

```bash
supabase db reset           # rebuild local schema
supabase migration new my_change
# write SQL in the generated file
supabase db reset           # apply locally
supabase test db            # run pgTAP if present
```

### 5.2 Production deploy

The team applies migrations directly to production via the Supabase MCP `apply_migration` tool (idempotent, transactional, single-statement-batched). Each migration is wrapped automatically — no manual `BEGIN`/`COMMIT` needed.

For risky DDL (data backfills, type changes, RLS rewrites that may break clients), use a **dev branch**:

```bash
# via dashboard:  Branches → Create
# or via MCP:
mcp__supabase__create_branch  --name "my-change"  --persist true
```

Apply migrations to the branch, run advisor + smoke tests, then `merge_branch` to promote.

### 5.3 Rollback

Production data lives in a single Postgres database with **point-in-time recovery** enabled (Supabase paid plan). Rollback strategy:

1. Identify the offending migration timestamp.
2. Issue a PITR restore via `Dashboard → Database → Backups → Restore` to T-1min before the migration.
3. Re-apply any non-offending migrations that were timestamped after the bad one (none, in practice — migrations land one at a time).

For policy-only mistakes, a forward-fix migration that drops the bad policy and recreates the previous one is preferred over PITR.

---

## 6. Backfills

When introducing a `NOT NULL` constraint to a previously-nullable tenant column, follow this two-phase pattern:

```sql
-- Phase 1: backfill (idempotent — re-running is a no-op once converged)
UPDATE public.my_table
SET org_id = '00000000-0000-0000-0000-000000000001'::uuid  -- demo org
WHERE org_id IS NULL;

-- Verify
SELECT count(*) FROM public.my_table WHERE org_id IS NULL;  -- expect 0

-- Phase 2: lock the schema
ALTER TABLE public.my_table ALTER COLUMN org_id SET NOT NULL;
```

The Phase 2 audit (April 2026) discovered all tested tables already had **zero null tenant rows** — the audit baseline was stale. Run the verification query before scheduling a backfill window.

---

## 7. Operational Runbooks

### 7.1 "Authenticated user sees all tenants"

Root cause is almost always a permissive `USING (true)` policy alongside the org-scoped one. Postgres OR-combines permissive policies — the always-true wins.

```sql
-- Find the culprit
SELECT tablename, policyname, cmd, roles, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'my_table';

-- Drop the permissive one
DROP POLICY my_table_auth_read ON public.my_table;
```

### 7.2 "Function is being flagged as `search_path` mutable"

```sql
ALTER FUNCTION public.my_function(arg_types) SET search_path = '';
```

If the function references unqualified objects (`SELECT * FROM users` instead of `public.users`), they'll break — fully qualify all references first.

### 7.3 "View flagged as `security_definer_view`"

```sql
ALTER VIEW public.my_view SET (security_invoker = true);
```

Any view that joins RLS-protected tables must run with `security_invoker`.

### 7.4 "Cross-tenant cache leakage on org switch"

The frontend must invalidate all TanStack Query caches on `SIGNED_IN`, `SIGNED_OUT`, `USER_UPDATED` (but **not** `TOKEN_REFRESHED`, which fires every 50 minutes and would thrash the cache). The reference implementation is in `dashboard/src/providers/SupabaseAuthListener.tsx`.

---

## 8. Security Posture

Phase 2 audit (April 2026) post-remediation state:

| Advisor finding | Pre | Post |
|---|---|---|
| `security_definer_view` ERRORs | 1 | **0** |
| `rls_policy_always_true` WARNs (tenant tables) | 84 | **0** |
| `function_search_path_mutable` WARNs | 12 | **0** |
| `anon_security_definer_function_executable` WARNs | 7 | **0** |
| `authenticated_security_definer_function_executable` WARNs | 9 | 6 (intentional — RLS helpers) |
| `auth_leaked_password_protection` WARN | 1 | 1 (manual dashboard toggle) |
| `rls_enabled_no_policy` INFO (legacy CamelCase) | 66 | 66 (fail-closed, scheduled for PR4 drop) |

Live status: run `mcp__supabase__get_advisors --type security` against project `vhparvughsygyknblkzt`.

---

## 9. Appendices

### 9.1 Useful one-liners

```sql
-- Per-table policy count
SELECT tablename, count(*) AS n_policies
FROM pg_policies WHERE schemaname='public'
GROUP BY tablename ORDER BY n_policies DESC;

-- Tables missing tenant column
SELECT t.table_name FROM information_schema.tables t
WHERE t.table_schema='public' AND t.table_type='BASE TABLE'
  AND NOT EXISTS (SELECT 1 FROM information_schema.columns c
                  WHERE c.table_schema='public' AND c.table_name=t.table_name
                    AND c.column_name IN ('org_id','tenant_id'));

-- Functions missing pinned search_path
SELECT n.nspname, p.proname, p.proconfig
FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public' AND p.prosecdef = true
  AND (p.proconfig IS NULL OR NOT 'search_path=' = ANY(p.proconfig));
```

### 9.2 References

- Supabase Database Linter: <https://supabase.com/docs/guides/database/database-linter>
- PostgreSQL RLS docs: <https://www.postgresql.org/docs/current/ddl-rowsecurity.html>
- Sentinel Phase 2 audit: [`docs/audit/PHASE2_FULL_AUDIT.md`](audit/PHASE2_FULL_AUDIT.md)
- Migration history: [`supabase/migrations/`](../supabase/migrations)

---

*Last updated: April 28, 2026 — post Phase 2 P0 remediation.*
