-- ---------------------------------------------------------------------------
-- 20260826000002_framework_catalog_live_schema_compat.sql
--
-- Makes the framework-catalog set applicable to the uuid-keyed `frameworks`
-- schema that the live project actually runs.
--
-- BACKGROUND. Two `frameworks` schemas exist in this repo's history:
--
--   A. slug-keyed  (20260418000003): id TEXT PRIMARY KEY, short_name,
--      issuing_body, effective_date, structure, url, adopted, coverage_pct
--   B. uuid-keyed  (the live project): id uuid DEFAULT gen_random_uuid(),
--      code, category, jurisdiction, description, control_count,
--      controls_total, score, target_score, is_active, owner_id
--
-- The 20260826000010–14 seed migrations were written against (A). On (B) two
-- things go wrong, neither visible from the files:
--   * their `INSERT INTO public.frameworks` blocks name columns that do not
--     exist, so the five added frameworks never arrive; and
--   * `public.framework_controls` may not exist at all, since on this project
--     it was never created by the earlier chain.
--
-- This migration supplies both, but ONLY on schema (B) — on (A) every block is
-- a guarded no-op, so a from-zero replay of the original chain is unaffected.
-- It must run before the 20260826000010+ seeds (which write catalog rows) and
-- before 20260826000021 (which binds those rows to the uuid id-space).
--
-- Idempotent; safe to re-run.
-- ---------------------------------------------------------------------------

-- 1. framework_controls: create if the earlier chain never did. Column shape
--    matches 20260418000003 so both schemas converge on the same table.
CREATE TABLE IF NOT EXISTS public.framework_controls (
  id text PRIMARY KEY,
  org_id uuid,
  framework_id text,
  control_ref text NOT NULL,
  domain text,
  title text NOT NULL,
  description text,
  control_type text,
  priority text DEFAULT 'medium',
  status text DEFAULT 'not_started',
  owner text,
  evidence_count integer DEFAULT 0,
  last_assessed date,
  maturity_level integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- org_id is filled by the DB, never by the client (First principle #3). Guarded
-- because the resolver may not exist this early in a bare replay.
DO $fc_default$
BEGIN
  BEGIN
    ALTER TABLE public.framework_controls
      ALTER COLUMN org_id SET DEFAULT current_user_org_id();
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'current_user_org_id() unavailable here; org_id default deferred';
  END;
END $fc_default$;

ALTER TABLE public.framework_controls ENABLE ROW LEVEL SECURITY;

-- Catalog rows are published reference material: readable across the org, and
-- rows with a NULL org_id are shared/global. Same shape as the platform's other
-- org-scoped policies (org_id IS NULL OR org_id = current_user_org_id()).
DO $fc_policy$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_user_org_id') THEN
    DROP POLICY IF EXISTS framework_controls_org_all ON public.framework_controls;
    CREATE POLICY framework_controls_org_all ON public.framework_controls
      FOR ALL TO authenticated
      USING (org_id IS NULL OR org_id = current_user_org_id())
      WITH CHECK (org_id IS NULL OR org_id = current_user_org_id());
  END IF;
  DROP POLICY IF EXISTS framework_controls_service_role_all ON public.framework_controls;
  CREATE POLICY framework_controls_service_role_all ON public.framework_controls
    FOR ALL TO service_role USING (true) WITH CHECK (true);
END $fc_policy$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.framework_controls TO authenticated;
GRANT ALL ON public.framework_controls TO service_role;

CREATE INDEX IF NOT EXISTS idx_fc_framework_org    ON public.framework_controls (framework_id, org_id);
CREATE INDEX IF NOT EXISTS idx_fc_framework_domain ON public.framework_controls (framework_id, domain);
CREATE INDEX IF NOT EXISTS idx_fc_control_ref      ON public.framework_controls (control_ref);

-- 2. The five frameworks the catalog adds, inserted with LIVE columns.
--    Runs only on schema (B): detected by `code` present and `short_name`
--    absent. On schema (A) the seeds' own inserts already cover these.
DO $fw_live$
BEGIN
  IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name='frameworks' AND column_name='code')
     AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema='public' AND table_name='frameworks' AND column_name='short_name')
  THEN
    INSERT INTO public.frameworks
      (org_id, name, version, type, code, category, jurisdiction, description, control_count, controls_total)
    SELECT * FROM (VALUES
      ('00000000-0000-0000-0000-000000000001'::uuid, 'SOC 2 - Trust Services Criteria', '2017 (rev. 2022)', 'standard', 'FW-011', 'Information Security', 'United States', 'AICPA Trust Services Criteria for security, availability, processing integrity, confidentiality and privacy, used for SOC 2 examinations of service organizations.', 61, 61),
      ('00000000-0000-0000-0000-000000000001'::uuid, 'ISO/IEC 27001:2022', '2022', 'standard', 'FW-012', 'Information Security', 'International', 'International standard for information security management systems (ISMS); Annex A lists 93 reference controls across organizational, people, physical and technological themes.', 93, 93),
      ('00000000-0000-0000-0000-000000000001'::uuid, 'Payment Card Industry Data Security Standard', '4.0', 'standard', 'FW-013', 'Payment Security', 'Global', 'Baseline of technical and operational requirements to protect account data; twelve principal requirements grouped into six control objectives.', 246, 246),
      ('00000000-0000-0000-0000-000000000001'::uuid, 'Health Insurance Portability and Accountability Act', '2013 Omnibus', 'regulation', 'FW-014', 'Healthcare Privacy', 'United States', 'U.S. federal rules protecting the privacy and security of protected health information (PHI): Security Rule, Privacy Rule and Breach Notification Rule.', 76, 76),
      ('00000000-0000-0000-0000-000000000001'::uuid, 'HITRUST CSF', 'v11', 'standard', 'FW-015', 'Healthcare Security', 'United States', 'The HITRUST Common Security Framework harmonizes healthcare and cross-industry security, privacy and regulatory requirements into a single certifiable set of controls.', 156, 156)
    ) AS v(org_id, name, version, type, code, category, jurisdiction, description, control_count, controls_total)
    WHERE NOT EXISTS (SELECT 1 FROM public.frameworks f WHERE f.name = v.name);
  END IF;
END $fw_live$;

COMMENT ON TABLE public.framework_controls IS
  'Authoritative per-org catalog of each framework''s published controls, seeded from the real standards. framework_id holds frameworks.id; on the uuid-keyed schema 20260826000021 rewrites the seeds'' slugs to uuids so the catalog resolves.';
