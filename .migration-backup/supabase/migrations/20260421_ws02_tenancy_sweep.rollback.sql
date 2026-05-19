-- ============================================================================
-- Apache-2.0 © 2026 CERTIFYI-AI
-- Rollback for 20260421_ws02_tenancy_sweep.sql
--
-- Intent: drop the canonical RLS policies and indexes installed by the sweep.
-- We do NOT re-create `tenant_id` columns — backfill is irreversible.
-- A full recovery requires restoring from a PITR backup (Supabase `restore_project`).
--
-- Usage:
--   supabase db execute -f supabase/migrations/20260421_ws02_tenancy_sweep.rollback.sql
-- ============================================================================

BEGIN;

-- 1. Drop the ws01_* / ws02_* policies we own.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname='public'
       AND (policyname LIKE 'ws01_%' OR policyname LIKE 'ws02_%')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;',
      p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;

-- 2. Drop the idx_<table>_org_id indexes we own.
DO $$
DECLARE i record;
BEGIN
  FOR i IN
    SELECT schemaname, indexname
      FROM pg_indexes
     WHERE schemaname='public'
       AND indexname LIKE 'idx\_%\_org\_id' ESCAPE '\'
  LOOP
    EXECUTE format('DROP INDEX IF EXISTS %I.%I;', i.schemaname, i.indexname);
  END LOOP;
END $$;

-- 3. Disable RLS on tables that have no remaining policies.
DO $$
DECLARE t record;
BEGIN
  FOR t IN
    SELECT c.relname
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
     WHERE n.nspname='public' AND c.relkind='r' AND c.relrowsecurity
       AND NOT EXISTS (SELECT 1 FROM pg_policies p
                        WHERE p.schemaname='public' AND p.tablename=c.relname)
  LOOP
    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY;', t.relname);
  END LOOP;
END $$;

COMMIT;
