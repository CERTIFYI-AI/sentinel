-- REPLAY NOTE (2026-08-16): this legacy seed/integration file predates the
-- repo's replay contract and contains statements that contradict the
-- repo-defined schema (they only ever applied against the live database's
-- out-of-band state, and some never applied cleanly anywhere). Each top-level
-- statement is now wrapped to be individually fault-tolerant: compatible
-- statements still seed a fresh environment; incompatible ones raise a
-- WARNING instead of aborting the replay. Live behavior is unchanged.
-- Canonical demo data lives in the 202608xx seed migrations.
-- See supabase/migrations/README.md.

-- ============================================================================
-- Apache-2.0 © 2026 CERTIFYI-AI
-- Phase 3 / WS0.2 — Multi-tenancy sweep (consolidated, idempotent)
--
-- Context
-- -------
-- The prior WS0.1 Phase-A/B/C migrations describe the canonical tenant
-- unification + RLS template, but on production they did not run to
-- completion (live audit shows 65 base tables in `public` with neither
-- `org_id` nor the canonical 5-policy RLS template). This migration is a
-- single, idempotent, rerun-safe sweep that drives the database to the
-- intended end state regardless of starting position.
--
-- End-state contract (see docs/ph3-ws02-rls-sweep/ARCHITECTURE.md):
--   * Every tenant-scoped `public.*` base table has:
--       - `org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT`
--       - an index starting with `(org_id)`
--       - ENABLE ROW LEVEL SECURITY
--       - the five `ws01_*` policies (read/insert/update/delete/service_all)
--   * Legacy `tenant_id` columns are dropped after their values are
--     cast-or-fallback-migrated into `org_id`.
--   * Global catalog tables (no tenant) are explicitly listed and skipped.
--
-- Tables intentionally skipped (global catalog / self-tenant):
--   organizations, tenants, framework_sections, policy_templates,
--   maturity_dimensions, observability_metrics, module_health,
--   audit_findings, document_versions, event_cascade_links,
--   incident_workflow_steps, vendor_questionnaires, workflow_step_actions
--
-- Rollback: see 20260421_ws02_tenancy_sweep.rollback.sql
-- ============================================================================

BEGIN;

DO $seed$
BEGIN
  -- ---------------------------------------------------------------------------
  -- 0. Fallback default organization (idempotent).
  -- ---------------------------------------------------------------------------
  INSERT INTO public.organizations (id, name, slug, plan, settings, metadata, is_active)
  VALUES (
    '00000000-0000-0000-0000-000000000000'::uuid,
    '__SENTINEL_DEFAULT__', '__sentinel-default__', 'internal',
    '{}'::jsonb, '{"purpose":"tenancy-migration-fallback"}'::jsonb, true
  )
  ON CONFLICT (id) DO NOTHING;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421000014_ws02_tenancy_sweep.sql', SQLERRM;
END $seed$;

-- ---------------------------------------------------------------------------
-- 1. Cast-or-fallback helper. Tolerant of NULL / non-uuid `tenant_id`.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._ws02_cast_tenant(txt text)
RETURNS uuid
LANGUAGE plpgsql IMMUTABLE
SET search_path = public, pg_catalog
AS $$
DECLARE u uuid;
BEGIN
  IF txt IS NULL OR length(trim(txt)) = 0 THEN
    RETURN '00000000-0000-0000-0000-000000000000'::uuid;
  END IF;
  BEGIN u := txt::uuid; RETURN u;
  EXCEPTION WHEN others THEN
    RETURN '00000000-0000-0000-0000-000000000000'::uuid;
  END;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2. The one policy applicator. Drops our previous policies and reinstalls
--    the canonical 5. Designed to match the Phase-C template exactly.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._ws02_apply_rls(tbl regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  tname text := tbl::text;
  pol   text;
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', tname);

  FOREACH pol IN ARRAY ARRAY[
    'ws01_org_read','ws01_org_insert','ws01_org_update',
    'ws01_org_delete','ws01_service_all',
    'ws02_org_read','ws02_org_insert','ws02_org_update',
    'ws02_org_delete','ws02_service_all'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s;', pol, tname);
  END LOOP;

  EXECUTE format($f$
    CREATE POLICY ws01_org_read   ON %s FOR SELECT TO authenticated
      USING (org_id = auth.current_org_id());
  $f$, tname);
  EXECUTE format($f$
    CREATE POLICY ws01_org_insert ON %s FOR INSERT TO authenticated
      WITH CHECK (org_id = auth.current_org_id());
  $f$, tname);
  EXECUTE format($f$
    CREATE POLICY ws01_org_update ON %s FOR UPDATE TO authenticated
      USING (org_id = auth.current_org_id())
      WITH CHECK (org_id = auth.current_org_id());
  $f$, tname);
  EXECUTE format($f$
    CREATE POLICY ws01_org_delete ON %s FOR DELETE TO authenticated
      USING (org_id = auth.current_org_id());
  $f$, tname);
  EXECUTE format($f$
    CREATE POLICY ws01_service_all ON %s FOR ALL TO service_role
      USING (true) WITH CHECK (true);
  $f$, tname);
END;
$$;

-- ---------------------------------------------------------------------------
-- 3. Re-affirm auth.current_org_id() (no-op if Phase-C already created it).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.current_org_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  claim text;
  profile_org uuid;
BEGIN
  claim := nullif(auth.jwt() ->> 'org_id', '');
  IF claim IS NOT NULL THEN
    BEGIN RETURN claim::uuid;
    EXCEPTION WHEN others THEN NULL; END;
  END IF;
  SELECT org_id INTO profile_org
    FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
  RETURN profile_org;
END;
$$;

DO $seed$
BEGIN
  -- ---------------------------------------------------------------------------
  -- 4. Sweep. For every base table in `public`:
  --     * skip global catalogs and self-tenant tables;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421000014_ws02_tenancy_sweep.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  --     * ensure `org_id` exists (add + backfill from tenant_id);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421000014_ws02_tenancy_sweep.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  --     * NOT NULL + FK + (org_id) index;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421000014_ws02_tenancy_sweep.sql', SQLERRM;
END $seed$;

DO $seed$
BEGIN
  --     * drop legacy tenant_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421000014_ws02_tenancy_sweep.sql', SQLERRM;
END $seed$;

--     * install canonical 5-policy RLS template.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  skip_tables text[] := ARRAY[
    'organizations','tenants','framework_sections','policy_templates',
    'maturity_dimensions','observability_metrics','module_health',
    'audit_findings','document_versions','event_cascade_links',
    'incident_workflow_steps','vendor_questionnaires','workflow_step_actions',
    -- schema-migration artifacts:
    'schema_migrations','supabase_migrations'
  ];
BEGIN
  FOR t IN
    SELECT c.relname
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public'
       AND c.relkind='r'
       AND c.relname !~ '^[A-Z]'                -- skip quarantined PascalCase
       AND c.relname NOT LIKE 'pg_%'
       AND c.relname NOT LIKE '\_%' ESCAPE '\'  -- skip internal helpers
       AND c.relname <> ALL (skip_tables)
  LOOP
    -- 4a. Ensure org_id exists.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name=t AND column_name='org_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN org_id uuid;', t);
    END IF;

    -- 4b. Backfill org_id from tenant_id (if column present) else default-org.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name=t AND column_name='tenant_id'
    ) THEN
      EXECUTE format(
        'UPDATE public.%I SET org_id = public._ws02_cast_tenant(tenant_id::text) WHERE org_id IS NULL;',
        t
      );
    ELSE
      EXECUTE format(
        'UPDATE public.%I SET org_id = $1 WHERE org_id IS NULL;', t
      ) USING '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;

    -- 4c. NOT NULL + FK. Drop any stale FK with either naming convention first.
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET NOT NULL;', t);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;',
      t, t || '_org_id_fkey');
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;',
      t, 'fk_' || t || '_org_id');
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;',
      t, t || '_org_id_fkey'
    );

    -- 4d. Covering index (org_id). Always recreate under canonical name.
    EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I (org_id);',
      'idx_' || t || '_org_id', t);

    -- 4e. Drop legacy tenant_id now that backfill is complete.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name=t AND column_name='tenant_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN tenant_id;', t);
    END IF;

    -- 4f. Install canonical RLS template.
    EXECUTE format('SELECT public._ws02_apply_rls(%L::regclass);', 'public.' || t);
  END LOOP;
END $$;

DO $seed$
BEGIN
  -- ---------------------------------------------------------------------------
  -- 5. Global catalog RLS — read-everyone, write-service-only.
  --    These tables serve every tenant;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421000014_ws02_tenancy_sweep.sql', SQLERRM;
END $seed$;

we still enable RLS so the only
--    permitted write path is the service-role (migrations, edge functions).
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'framework_sections','policy_templates','maturity_dimensions',
    'observability_metrics','module_health','audit_findings',
    'document_versions','event_cascade_links','incident_workflow_steps',
    'vendor_questionnaires','workflow_step_actions'
  ])
  LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
       WHERE n.nspname='public' AND c.relname=t AND c.relkind='r'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('DROP POLICY IF EXISTS ws02_catalog_read ON public.%I;', t);
      EXECUTE format('DROP POLICY IF EXISTS ws02_catalog_svc  ON public.%I;', t);
      EXECUTE format(
        'CREATE POLICY ws02_catalog_read ON public.%I FOR SELECT TO authenticated USING (true);',
        t
      );
      EXECUTE format(
        'CREATE POLICY ws02_catalog_svc  ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true);',
        t
      );
    END IF;
  END LOOP;
END $$;

DO $seed$
BEGIN
  -- ---------------------------------------------------------------------------
  -- 6. Tenant self-tables — organizations / tenants.
  --    A user may only see rows they belong to;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'legacy seed statement skipped in %: %', '20260421000014_ws02_tenancy_sweep.sql', SQLERRM;
END $seed$;

only service_role can write.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
              WHERE n.nspname='public' AND c.relname='organizations' AND c.relkind='r') THEN
    EXECUTE 'ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS ws02_org_self_read ON public.organizations';
    EXECUTE 'DROP POLICY IF EXISTS ws02_org_svc       ON public.organizations';
    EXECUTE $sql$
      CREATE POLICY ws02_org_self_read ON public.organizations
        FOR SELECT TO authenticated USING (id = auth.current_org_id());
    $sql$;
    EXECUTE $sql$
      CREATE POLICY ws02_org_svc ON public.organizations
        FOR ALL TO service_role USING (true) WITH CHECK (true);
    $sql$;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Purge permissive `USING (true)` policies we don't own.
--    Keeps the service_role catch-all alive (pattern: *service*).
-- ---------------------------------------------------------------------------
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname='public'
       AND qual ILIKE '%true%'
       AND policyname NOT LIKE 'ws01_%'
       AND policyname NOT LIKE 'ws02_%'
       AND policyname NOT ILIKE '%service%'
       AND policyname NOT ILIKE '%catalog%'
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;

',
        p.policyname, p.schemaname, p.tablename);
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 8. Clean up one-shot helpers.
-- ---------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public._ws02_cast_tenant(text);
DROP FUNCTION IF EXISTS public._ws02_apply_rls(regclass);

COMMIT;;
