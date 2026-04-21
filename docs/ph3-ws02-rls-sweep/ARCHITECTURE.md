# Phase 3 WS0.2 — Multi-tenant RLS Sweep

## Problem
A production audit of the live Sentinel Supabase database (project
`vhparvughsygyknblkzt`) uncovered material tenancy drift:

| Category | Count |
|---------:|:------|
| `public.*` base tables (excl. `pg_*`, PascalCase quarantine) | 120 |
| Tables **without** `org_id` column | 65 |
| Tables with `org_id` but no `(org_id)` index | 24 |
| Tables carrying a legacy `tenant_id` column | ~55 |
| Tables with zero RLS policies installed | 38 |

The prior WS01 migrations (`20260421_ws01_tenancy_phase_{a,b,c}.sql`) were
authored correctly but **did not run to completion on production** — the
`list_migrations` endpoint shows the DB stopped at
`governance_events_webhook_trigger_v2`. Rather than replay those three
migrations against a drifted production (which risks non-idempotent paths),
WS0.2 delivers one **idempotent, rerun-safe** sweep that drives the
database to the intended end state regardless of starting position.

## End-state contract
Every `public.*` base table that is **not** an explicit global catalog:

1. Has `org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT`.
2. Has an index whose first key is `org_id` (`idx_<table>_org_id`).
3. Has `ENABLE ROW LEVEL SECURITY`.
4. Has the canonical five policies installed:
   - `ws01_org_read`   — `SELECT … USING (org_id = auth.current_org_id())`
   - `ws01_org_insert` — `INSERT … WITH CHECK (org_id = auth.current_org_id())`
   - `ws01_org_update` — `UPDATE … USING & WITH CHECK (org_id = auth.current_org_id())`
   - `ws01_org_delete` — `DELETE … USING (org_id = auth.current_org_id())`
   - `ws01_service_all` — `ALL TO service_role`

### Explicit catalog carve-out
Tables that serve every tenant and must not be scoped:
```
framework_sections  policy_templates  maturity_dimensions
observability_metrics  module_health  audit_findings
document_versions  event_cascade_links  incident_workflow_steps
vendor_questionnaires  workflow_step_actions
```
These get `ws02_catalog_read` (`SELECT true` for authenticated) plus
`ws02_catalog_svc` (`ALL` for service_role). No writes from client code.

### Self-tenant carve-out
`public.organizations` and `public.tenants` get:
- `ws02_org_self_read` — `SELECT id = auth.current_org_id()`
- `ws02_org_svc` — `ALL TO service_role`

## Migration mechanics
`20260421_ws02_tenancy_sweep.sql` contains one `BEGIN` and one `COMMIT`, and
operates as a single transaction. The core sweep loop iterates every
`public.*` base table (excluding the skip list) and, for each, executes
six idempotent phases:

1. **Add column** `org_id uuid` if missing.
2. **Backfill** `org_id` from `tenant_id` (cast-or-fallback to the sentinel
   default-org uuid `0000…0000`). Rows with no tenant attribution land in
   the default org so ops can triage.
3. **NOT NULL + FK**. Drops stale FKs under both naming conventions
   (`<table>_org_id_fkey`, `fk_<table>_org_id`) and reinstalls the canonical
   name.
4. **(org_id) index** — `CREATE INDEX IF NOT EXISTS idx_<table>_org_id`.
5. **Drop** the legacy `tenant_id` column.
6. **Apply RLS** via the `_ws02_apply_rls()` helper which
   drops/re-creates the canonical five policies.

After the loop, a clean-up block drops any `USING(true)` policies we don't
own, excluding anything whose name contains `service` or `catalog`, and the
one-shot helper functions.

## `auth.current_org_id()`
Re-affirmed here as the single source of truth for every policy:
```sql
CREATE OR REPLACE FUNCTION auth.current_org_id() RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER AS $$
DECLARE claim text; profile_org uuid;
BEGIN
  claim := nullif(auth.jwt() ->> 'org_id', '');
  IF claim IS NOT NULL THEN
    BEGIN RETURN claim::uuid; EXCEPTION WHEN others THEN NULL; END;
  END IF;
  SELECT org_id INTO profile_org FROM public.user_profiles
   WHERE id = auth.uid() LIMIT 1;
  RETURN profile_org;
END; $$;
```

## Verification
Two layers:

### 1. Static (unit) — `dashboard/src/lib/__tests__/ws02-rls-invariants.test.ts`
Parses the migration SQL and asserts 11 structural invariants:
one-transaction, policy names, ordering of backfill-before-NOT-NULL,
catalog carve-out presence, helper cleanup, etc. Runs in every PR.

### 2. Dynamic (live) — `scripts/verify-ws02-rls.mjs`
Invoked by CI against an ephemeral Supabase branch after `apply_migration`.
Asserts:
- every non-catalog table has `org_id NOT NULL`, `(org_id)` index, RLS, and
  five `ws01_*` policies;
- cross-tenant isolation on a sample of 10 domain tables (seeds one row per
  tenant, then checks that authenticated sessions scoped to org A never
  observe org B rows).

## Rollback
`20260421_ws02_tenancy_sweep.rollback.sql` drops all `ws01_*` and `ws02_*`
policies, all `idx_*_org_id` indexes, and disables RLS on tables with no
remaining policies. It does **not** re-create `tenant_id` — backfill is
irreversible; full recovery requires a Supabase PITR restore.

## Findings closed
- Phase 3 finding #7 — RBAC enforcement foundation (tenancy is the floor).
- Phase 3 finding #14 — partial: cross-tenant error envelope now reliable.
- Supabase advisor notices on `public.*` with `rls_disabled`.

## Risk assessment
- **Data-loss risk:** low. Drop-column of `tenant_id` happens only after
  successful backfill of `org_id`; the sweep is transactional.
- **Availability risk:** low. RLS policies for `service_role` remain
  permissive, so migrations and edge functions keep working.
- **Perf risk:** one index create per affected table (~25) — sub-second on
  a schema this size; Postgres uses `CREATE INDEX IF NOT EXISTS` so re-runs
  are free.
- **Reversibility:** partial. Policies and indexes are reversible; the
  `tenant_id` column is not.

## Gherkin acceptance
```gherkin
Scenario: Cross-tenant reads are impossible after the sweep
  Given two organizations A and B exist
  And each has one row in every domain table
  When an authenticated session whose JWT claims org_id = A queries any domain table
  Then the session sees only rows with org_id = A
  And auditing the PostgREST logs shows zero rows with org_id = B leaked

Scenario: Catalog tables remain readable by every tenant
  Given the policy_templates catalog has 35 rows unchanged
  When any authenticated session queries policy_templates
  Then it receives all 35 rows
  And no authenticated session can INSERT or UPDATE that table

Scenario: The sweep is idempotent
  Given the WS0.2 sweep has already been applied once
  When the sweep runs a second time in the same database
  Then it commits with no errors
  And the end-state invariants still hold
```
