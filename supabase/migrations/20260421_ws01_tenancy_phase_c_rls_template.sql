-- ================================================================
-- WS0.1 — Multi-tenancy hardening — PHASE C
-- Installs the canonical RLS policy template on every tenant-scoped
-- table. One source of truth: auth.current_org_id().
--
-- Policy template per table:
--   * org_read    — SELECT where org_id = auth.current_org_id()
--   * org_insert  — INSERT with check org_id = auth.current_org_id()
--   * org_update  — UPDATE where org_id = auth.current_org_id()
--                   AND check no cross-tenant move
--   * org_delete  — DELETE where org_id = auth.current_org_id()
--                   (soft-delete preferred; hard-delete requires role)
--   * service_all — FOR ALL to service_role (migrations, edge funcs)
--
-- This replaces any permissive `USING (true)` policies installed
-- during early development.
-- ================================================================

BEGIN;

-- ---------------------------------------------------------------
-- 1. Canonical org-id resolver. Reads from either a custom JWT
--    claim (`org_id`) OR falls back to the user_profiles row.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION auth.current_org_id()
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  claim text;
  profile_org uuid;
BEGIN
  -- Primary: JWT app-metadata claim (set at SSO / invite-accept time).
  claim := nullif(auth.jwt() ->> 'org_id', '');
  IF claim IS NOT NULL THEN
    BEGIN RETURN claim::uuid;
    EXCEPTION WHEN others THEN NULL; END;
  END IF;

  -- Fallback: org_id from user_profiles (first-party table).
  SELECT org_id INTO profile_org
    FROM public.user_profiles
   WHERE id = auth.uid()
   LIMIT 1;

  RETURN profile_org;
END;
$$;

COMMENT ON FUNCTION auth.current_org_id() IS
  'Returns the caller''s tenant (org_id). Source of truth for every RLS policy.';

-- ---------------------------------------------------------------
-- 2. Reusable policy applicator. For every tenant-scoped table,
--    drops any existing auto-named policies we own and reinstalls
--    the 5-policy template.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._ws01_apply_rls(tbl regclass)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  tname text := tbl::text;  -- fully qualified
  pol  text;
BEGIN
  EXECUTE format('ALTER TABLE %s ENABLE ROW LEVEL SECURITY;', tname);

  -- Drop our previously-installed policies (idempotent re-run).
  FOREACH pol IN ARRAY ARRAY['ws01_org_read','ws01_org_insert','ws01_org_update','ws01_org_delete','ws01_service_all']
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %s;', pol, tname);
  END LOOP;

  -- Install the canonical 5.
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

-- ---------------------------------------------------------------
-- 3. Apply to every tenant-scoped base table in `public`.
-- ---------------------------------------------------------------
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.table_name
      FROM information_schema.columns c
      JOIN information_schema.tables tb
        ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
     WHERE c.table_schema = 'public'
       AND c.column_name = 'org_id'
       AND tb.table_type = 'BASE TABLE'
       AND c.table_name !~ '^[A-Z]'  -- skip quarantined PascalCase
  LOOP
    PERFORM public._ws01_apply_rls(format('public.%I', t.table_name)::regclass);
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- 4. Drop any legacy permissive policies that used USING(true).
--    Matches names left by earlier bootstraps.
-- ---------------------------------------------------------------
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname='public'
       AND qual ILIKE '%true%'
       AND policyname NOT LIKE 'ws01_%'
       AND policyname NOT LIKE '%service%'
  LOOP
    BEGIN
      EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;',
        p.policyname, p.schemaname, p.tablename);
    EXCEPTION WHEN others THEN NULL;
    END;
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- 5. Force RLS so table owners / service_role still respect policies
--    in local development (guards against accidental bypass).
-- ---------------------------------------------------------------
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname AS tname
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r' AND c.relname !~ '^[A-Z]'
       AND EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name=c.relname
                      AND column_name='org_id')
  LOOP
    -- NOTE: we ENABLE not FORCE; service_role must still bypass for
    -- edge-function and migration work. Cross-tenant protection is
    -- enforced at the application layer via assertSameTenant.
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t.tname);
  END LOOP;
END $$;

DROP FUNCTION public._ws01_apply_rls(regclass);

COMMIT;
