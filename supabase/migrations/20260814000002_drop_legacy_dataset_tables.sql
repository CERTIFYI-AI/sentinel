-- =============================================================================
-- Drop the legacy datasets cluster — AI Assets audit finding F-8, following
-- the procedure in docs/architecture/db/schema_consolidation_plan.sql.
--
-- Verified before drop (2026-08-14):
--   * Frontend/worker/package code references: none (repo-wide grep).
--     - datasetService/pages now use canonical `datasets`;
--     - dataGovernanceAgent repointed off dataset_registry/model_dataset_links;
--     - data_assets service/hooks were dead code, removed in the same commit.
--   * sentinel/api/dataset_router.py targets the Python backend's own schema
--     (tenant_id/category/volume_records + model_inventory/bias_audits) and is
--     column-incompatible with this Supabase table — it does not run here.
--   * Row counts: Dataset 0, dataset_registry 0, datasetregistry_table 0,
--     model_dataset_links 0, data_assets 0; datalineage_table 5 and
--     dataquality_table 6 contained only fabricated demo seeds — archived to
--     legacy_archive.* below rather than deleted outright.
--   * dataset_catalog_entries is NOT dropped — actively used by the evals
--     Dataset Wizard / Data Explorer.
--
-- Idempotent; safe to re-run.
-- =============================================================================

-- 1. Archive the seed-only rows in-database before dropping.
CREATE SCHEMA IF NOT EXISTS legacy_archive;

DO $$
BEGIN
  IF to_regclass('public.datalineage_table') IS NOT NULL
     AND to_regclass('legacy_archive.datalineage_table') IS NULL THEN
    CREATE TABLE legacy_archive.datalineage_table AS TABLE public.datalineage_table;
  END IF;
  IF to_regclass('public.dataquality_table') IS NOT NULL
     AND to_regclass('legacy_archive.dataquality_table') IS NULL THEN
    CREATE TABLE legacy_archive.dataquality_table AS TABLE public.dataquality_table;
  END IF;
END $$;

-- 2. Release FKs held by tables that remain (their clusters consolidate later).
--    "Dataset" is empty, so these constraints reference no rows.
-- (replay-safety: on a from-zero replay these PascalCase names are quarantine
--  VIEWS, not tables — only drop constraints when they are real tables)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='Model' AND c.relkind='r') THEN
    ALTER TABLE public."Model" DROP CONSTRAINT IF EXISTS "Model_datasetId_fkey";
  END IF;
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='BiasAudit' AND c.relkind='r') THEN
    ALTER TABLE public."BiasAudit" DROP CONSTRAINT IF EXISTS "BiasAudit_datasetId_fkey";
  END IF;
END $$;

-- 3. Drop the legacy cluster (order: dependents first).
DROP TABLE IF EXISTS public.model_dataset_links;
DROP TABLE IF EXISTS public.dataset_registry;
DO $$ BEGIN
  EXECUTE (SELECT CASE c.relkind WHEN 'v' THEN 'DROP VIEW IF EXISTS public."Dataset" CASCADE' ELSE 'DROP TABLE IF EXISTS public."Dataset" CASCADE' END
           FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
           WHERE n.nspname='public' AND c.relname='Dataset');
EXCEPTION WHEN OTHERS THEN NULL; END $$;
DROP TABLE IF EXISTS public.datasetregistry_table;
DROP TABLE IF EXISTS public.datalineage_table;
DROP TABLE IF EXISTS public.dataquality_table;
DROP TABLE IF EXISTS public.data_assets;

-- 4. The archive is for operators only — keep it away from the API roles.
REVOKE ALL ON ALL TABLES IN SCHEMA legacy_archive FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA legacy_archive REVOKE ALL ON TABLES FROM anon, authenticated;

-- 5. The governance-mesh config seeded by 20260421 pointed DataGovernanceAgent
--    at the dropped tables; repoint it at the canonical one.
UPDATE public.agent_registry
SET target_modules = ARRAY['datasets','consent_records']
WHERE agent_name = 'DataGovernanceAgent' AND target_modules @> ARRAY['dataset_registry'];
