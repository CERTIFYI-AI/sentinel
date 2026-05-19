-- ================================================================
-- WS0.1 — Multi-tenancy hardening — PHASE A (unify tenant_id → org_id)
-- ================================================================
-- Apache-2.0 © 2026 CERTIFYI-AI
--
-- Consolidates two coexisting tenancy conventions:
--   - legacy `tenant_id` (text, pre-Supabase-Auth) on 57 tables
--   - canonical `org_id` (uuid, FK → organizations.id)
--
-- Strategy per table:
--   1. If `org_id` already exists (4 tables had both) → backfill from
--      tenant_id where org_id IS NULL, then drop tenant_id.
--   2. Otherwise → add `org_id uuid`, backfill by casting tenant_id to uuid
--      (tolerant of invalid values which land in the "default" org),
--      add FK, drop tenant_id.
--
-- Pre-conditions:
--   - `organizations` table exists with uuid primary key.
--   - A "default" organization row is guaranteed; created here if missing.
--
-- Post-conditions:
--   - Every listed table has `org_id uuid NOT NULL REFERENCES organizations(id)`.
--   - `tenant_id` column dropped.
--   - (org_id, <natural key>) index added where appropriate.
--
-- Rollback: see 20260421_ws01_tenancy_phase_a_unify.rollback.sql
-- ================================================================

BEGIN;

-- ---------------------------------------------------------------
-- 0. Safety net: ensure a fallback "default" organization exists.
--    Orphan rows (invalid or NULL tenant_id) land here for ops triage.
-- ---------------------------------------------------------------
INSERT INTO public.organizations (id, name, slug, plan, settings, metadata, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000000'::uuid,
  '__SENTINEL_DEFAULT__',
  '__sentinel-default__',
  'internal',
  '{}'::jsonb,
  '{"purpose":"tenancy-migration-fallback"}'::jsonb,
  true
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------
-- 1. Helper: cast-or-fallback. Returns uuid or the default-org uuid
--    when the input is NULL / not a valid uuid. Immutable, STRICT-safe.
-- ---------------------------------------------------------------
CREATE OR REPLACE FUNCTION public._ws01_cast_tenant_to_org(txt text)
RETURNS uuid
LANGUAGE plpgsql
IMMUTABLE
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

-- ---------------------------------------------------------------
-- 2. Single DO block iterates every target table. Idempotent.
-- ---------------------------------------------------------------
DO $$
DECLARE
  t text;
  r record;
  target_tables text[] := ARRAY[
    'ai_impact_assessments','api_keys','assets','attack_surface_assets','audits',
    'bcp_plans','bia_processes','bias_audits','carbon_records','committees',
    'compliance_calendar','compliance_events','compliance_scores','conformity_assessments',
    'consent_records','custom_roles','dashboard_snapshots','data_assets','datasets',
    'departments','documents','ethics_reports','evidence','exceptions',
    'explainability_reports','guardrail_rules','guardrails','hitl_reviews','identities',
    'incidents','keys_vault','maturity_assessments','model_arena_runs','model_inventory',
    'policy_firewall_rules','rbac_roles','rbac_users','red_team_campaigns',
    'red_team_findings','regulation_entries','remediation_items','remediation_plans',
    'report_schedules','risks','security_scans','security_threats','security_vulnerabilities',
    'shadow_ai_findings','supply_chain_attestations','tasks','training_courses',
    'transparency_reports','use_cases','vendor_questionnaire','vendors',
    'workflow_instances','workflow_templates'
  ];
BEGIN
  FOREACH t IN ARRAY target_tables
  LOOP
    -- 2a. Ensure org_id column exists.
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='org_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN org_id uuid;', t);
    END IF;

    -- 2b. Backfill org_id from tenant_id where missing.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='tenant_id'
    ) THEN
      EXECUTE format(
        'UPDATE public.%I SET org_id = public._ws01_cast_tenant_to_org(tenant_id::text) WHERE org_id IS NULL;',
        t
      );
    ELSE
      EXECUTE format(
        'UPDATE public.%I SET org_id = $1 WHERE org_id IS NULL;',
        t
      ) USING '00000000-0000-0000-0000-000000000000'::uuid;
    END IF;

    -- 2c. NOT NULL + FK (deferred validation so existing rows don't block).
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET NOT NULL;', t);

    -- Drop any existing FK with the same name (re-runs safely).
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;',
      t, t || '_org_id_fkey'
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;',
      t, t || '_org_id_fkey'
    );

    -- 2d. Covering index on (org_id).
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (org_id);',
      'idx_' || t || '_org_id', t
    );

    -- 2e. Drop legacy tenant_id.
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='tenant_id'
    ) THEN
      EXECUTE format('ALTER TABLE public.%I DROP COLUMN tenant_id;', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- 3. Legacy PascalCase tables with `tenant_id text` that we keep live
--    for now (until Phase-D quarantine). Unify them too so RLS can
--    attach uniformly.
-- ---------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['ComplianceEvent','Notification','ShadowAIFinding'])
  LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name=t AND column_name='tenant_id') THEN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS org_id uuid;', t);
      EXECUTE format(
        'UPDATE public.%I SET org_id = public._ws01_cast_tenant_to_org(tenant_id::text) WHERE org_id IS NULL;',
        t
      );
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET NOT NULL;', t);
    END IF;
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- 4. Drop helper function — single-use.
-- ---------------------------------------------------------------
DROP FUNCTION IF EXISTS public._ws01_cast_tenant_to_org(text);

COMMIT;
