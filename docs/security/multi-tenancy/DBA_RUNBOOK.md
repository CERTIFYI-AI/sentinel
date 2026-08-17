<!--
  Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
  See LICENSE for details.
-->

# Multi-Tenancy DBA Runbook (WS0.1)

**Audience:** on-call DBAs, platform engineers, incident responders.
**Project:** Supabase `vhparvughsygyknblkzt` (prod) and staging.
**Last reviewed:** 2026-04-21.

---

## 1. Applying WS0.1 Migrations (First-Time)

Apply in order. Each phase is idempotent but the order matters.

```bash
# 1. Back up. Non-negotiable.
pg_dump "$DATABASE_URL" -Fc -f ws01_pre.dump

# 2. Announce a 30-minute read-only window.
#    (Phase A rewrites 57 tables; lock contention is expected.)

# 3. Apply in a transaction-friendly order.
supabase db push --file supabase/migrations/20260421000008_ws01_tenancy_phase_a_unify.sql
supabase db push --file supabase/migrations/20260421000009_ws01_tenancy_phase_b_backfill.sql
supabase db push --file supabase/migrations/20260421000010_ws01_tenancy_phase_c_rls_template.sql
supabase db push --file supabase/migrations/20260421000011_ws01_tenancy_quarantine_pascalcase.sql

# 4. Deploy the edge function.
supabase functions deploy set-active-org

# 5. Smoke-test (see §3).
```

### Phase A — `tenancy_phase_a_unify.sql`

**What it does:** renames every `tenant_id text` column to `org_id uuid`,
back-filling with the sentinel "Default Organization" UUID
`00000000-0000-0000-0000-000000000000` when the existing text value is
not a valid UUID. Drops the old `tenant_id` column after the copy.

**Risk:** **IRREVERSIBLE for any `tenant_id` value that was not a UUID.**
Those rows are forced into Default Organization. Export a diff of
non-UUID values before running:

```sql
-- Run ONCE, BEFORE migration. Save output.
SELECT table_name, count(*) AS non_uuid_rows
FROM information_schema.columns c
JOIN pg_tables t ON t.tablename = c.table_name AND t.schemaname = 'public'
WHERE c.column_name = 'tenant_id'
GROUP BY table_name
ORDER BY table_name;
```

If any customer-facing table shows non-zero rows, pause and consult
the owning team before proceeding.

### Phase B — `tenancy_phase_b_backfill.sql`

Adds `org_id`, `created_at`, `updated_at`, `created_by`, `updated_by`,
`deleted_at` to the 14 tables that previously had no tenancy at all.
Defaults new `org_id` values to Default Organization; owning teams
must repoint real rows afterwards.

### Phase C — `tenancy_phase_c_rls_template.sql`

Creates `auth.current_org_id()` and installs the five-policy template
on every tenant-scoped table. Existing policies are preserved — the
function call replaces only the `WHERE` predicate shape.

### Quarantine — `tenancy_quarantine_pascalcase.sql`

Renames 26 PascalCase Prisma leftover tables to `_deprecated_<Name>`
and creates empty views. No live traffic hits them. Full drop is
deferred to WS0.6.

---

## 2. Verifying the State

```sql
-- 2.1 Every public table must have an RLS stance.
SELECT table_name, row_security
FROM information_schema.tables t
JOIN pg_class c ON c.relname = t.table_name
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2.2 Tables with RLS enabled and zero policies (should be 0 rows
--     outside the quarantined _deprecated_* set).
SELECT n.nspname, c.relname
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_policy p ON p.polrelid = c.oid
WHERE c.relkind = 'r'
  AND c.relrowsecurity
  AND p.polname IS NULL
  AND n.nspname = 'public'
  AND c.relname NOT LIKE '\_deprecated\_%' ESCAPE '\'
GROUP BY n.nspname, c.relname;

-- 2.3 auth.current_org_id() installed.
SELECT auth.current_org_id();   -- returns NULL when run without a JWT

-- 2.4 Indexes on (org_id, created_at) for every tenant-scoped table.
SELECT c.relname, i.indexname
FROM pg_class c
JOIN pg_indexes i ON i.tablename = c.relname
WHERE c.relname IN (
  SELECT table_name FROM information_schema.columns
  WHERE column_name = 'org_id' AND table_schema = 'public'
)
AND i.indexdef LIKE '%org_id%';
```

---

## 3. Smoke Test (Production-Safe)

Using **two** test accounts in **two** different orgs:

1. Log in as user-A (org-A). Load `/overview`. Confirm dashboards show
   only org-A data.
2. In the browser console (on `/overview`):
   ```js
   const { data } = await window.supabase
     .from('models').select('org_id').limit(100);
   new Set(data.map(r => r.org_id));   // must be exactly { '<org-A-id>' }
   ```
3. Use `<OrgSwitcher/>` to hop to org-B (if the test account has
   multi-membership). Repeat the query — the returned set must now be
   exactly `{ '<org-B-id>' }`.
4. Try the same query with a forged JWT (manually edit `org_id` in a
   stored session and `localStorage.setItem`) — the query must return
   zero rows. RLS rejects forged claims because Postgres re-verifies
   the signature.

If any step leaks cross-tenant rows, **stop traffic and page the
on-call engineer**; this is a P0 security incident.

---

## 4. Offboarding an Organization

We do not cascade-delete. Procedure:

1. Disable login (`organizations.is_active = false`).
2. Revoke all `user_roles` for that org.
3. Snapshot the org's data (`pg_dump --schema=public --where` filtered
   by `org_id = '<id>'`) and deliver per the contract retention clause.
4. After retention window (default 90 days), issue soft-delete
   (`UPDATE <table> SET deleted_at = now() WHERE org_id = '<id>'`).
5. Hard-delete only after legal sign-off; use `tools/scripts/purge-org.sql`
   (to be written in WS0.3).

---

## 5. Rollback

`20260421_ws01_tenancy.rollback.sql` is a **lossy** rollback — it
drops the `org_id` columns introduced in Phase B and restores
`tenant_id` shells but does **not** recover the original text values
from before Phase A. Use only during cutover if Phase A uncovers
catastrophic data issues and you still hold the `pg_dump` from §1.

Never run rollback against a database that has accepted production
writes post-migration.

---

## 6. Adding a New Tenant-Scoped Table

Template migration (copy into a new file under `supabase/migrations/`):

```sql
CREATE TABLE public.<name> (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id      uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  -- domain columns here --
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  created_by  uuid,
  updated_by  uuid,
  deleted_at  timestamptz
);

CREATE INDEX <name>_org_id_created_at_idx
  ON public.<name> (org_id, created_at DESC);

ALTER TABLE public.<name> ENABLE ROW LEVEL SECURITY;

CREATE POLICY ws01_org_read   ON public.<name>
  FOR SELECT USING (org_id = auth.current_org_id());
CREATE POLICY ws01_org_insert ON public.<name>
  FOR INSERT WITH CHECK (org_id = auth.current_org_id());
CREATE POLICY ws01_org_update ON public.<name>
  FOR UPDATE USING (org_id = auth.current_org_id())
  WITH CHECK (org_id = auth.current_org_id());
CREATE POLICY ws01_org_delete ON public.<name>
  FOR DELETE USING (org_id = auth.current_org_id());
CREATE POLICY ws01_service_all ON public.<name>
  FOR ALL USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
```

Never ship a public.* table without all six of those blocks.

---

## 7. Escalation

- **Cross-tenant leak:** page #sec-oncall, engage customer-success
  per incident playbook, freeze write paths via `pg_advisory_lock`.
- **RLS performance regression:** inspect `pg_stat_statements` for
  policy evaluation; ensure `(org_id, …)` composite indexes exist.
- **JWT claim drift (user reports wrong org):** force
  `refreshSession()` client-side; if persistent, check
  `app_metadata.org_id` via the Supabase dashboard.
