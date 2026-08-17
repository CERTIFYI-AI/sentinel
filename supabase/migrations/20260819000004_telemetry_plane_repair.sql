-- 20260819000004_telemetry_plane_repair.sql
--
-- Telemetry/agent-call fabric repair (2026-08-16 fabric audit):
--   * The browser event bus could never write its own ledger: agent_executions
--     had no INSERT policy for authenticated, governance_events had no UPDATE
--     policy (events stuck 'pending' forever), event_cascade_links was
--     SELECT-only. Sweeps "succeeded" while every row was rejected by RLS.
--   * The governance_events read policy compared org_id to a top-level JWT
--     claim that is never set (org lives in app_metadata) — reads returned
--     nothing even for the right org. Policies now use current_user_org_id().
--   * Five tables the cascade agents write were never migrated at all:
--     compliance_scores, evidence_chain, transparency_reports,
--     training_courses (+ assignments), bcp_plans — every write silently lost
--     through safeInsert. Created here with the columns the agents send.
--   * incidents gains commander_role/classified_at (IncidentClassification);
--     vendors gains the SLA-breach fields VendorCascade stamps; ai_models
--     gains paused_reason/paused_at (Containment); workflow_instances gains
--     the fields the CI/CD block insert sends.
--   * regulation_entries.org_id default was a hardcoded demo uuid;
--     tabletop_exercises' policy predated the platform resolver convention.
-- Idempotent; safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Telemetry ledger RLS — org-scoped, via current_user_org_id().
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.governance_events') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS governance_events_org_read ON public.governance_events';
    EXECUTE 'DROP POLICY IF EXISTS governance_events_org_insert ON public.governance_events';
    EXECUTE 'DROP POLICY IF EXISTS governance_events_org_update ON public.governance_events';
    EXECUTE 'DROP POLICY IF EXISTS gov_events_org_read ON public.governance_events';
    EXECUTE 'DROP POLICY IF EXISTS gov_events_org_insert ON public.governance_events';
    EXECUTE 'CREATE POLICY governance_events_org_read ON public.governance_events '
         || 'FOR SELECT TO authenticated USING (org_id = current_user_org_id())';
    EXECUTE 'CREATE POLICY governance_events_org_insert ON public.governance_events '
         || 'FOR INSERT TO authenticated WITH CHECK (org_id = current_user_org_id())';
    EXECUTE 'CREATE POLICY governance_events_org_update ON public.governance_events '
         || 'FOR UPDATE TO authenticated USING (org_id = current_user_org_id()) '
         || 'WITH CHECK (org_id = current_user_org_id())';
  END IF;
  IF to_regclass('public.agent_executions') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS agent_executions_org_read ON public.agent_executions';
    EXECUTE 'DROP POLICY IF EXISTS agent_executions_org_insert ON public.agent_executions';
    EXECUTE 'CREATE POLICY agent_executions_org_read ON public.agent_executions '
         || 'FOR SELECT TO authenticated USING (org_id = current_user_org_id())';
    EXECUTE 'CREATE POLICY agent_executions_org_insert ON public.agent_executions '
         || 'FOR INSERT TO authenticated WITH CHECK (org_id = current_user_org_id())';
  END IF;
  IF to_regclass('public.event_cascade_links') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS cascade_org_insert ON public.event_cascade_links';
    EXECUTE 'CREATE POLICY cascade_org_insert ON public.event_cascade_links '
         || 'FOR INSERT TO authenticated WITH CHECK (true)';  -- link rows carry event ids, not org
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Tables the cascade agents write (were never migrated — writes lost).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.evidence_chain (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  entity_type text,
  entity_id text,
  action text,
  actor text,
  prev_hash text,
  hash text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_chain_org_time ON public.evidence_chain(org_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.compliance_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  framework text NOT NULL,
  score_delta numeric,
  trust_engine_delta numeric,
  recalculated_at timestamptz,
  caused_by_event_id text,
  gaps jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.transparency_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  report_type text,
  audience text,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'DRAFT',
  generated_by text,
  content text,
  event_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  title text NOT NULL,
  category text,
  status text NOT NULL DEFAULT 'DRAFT',
  content_url text,
  estimated_minutes integer,
  generated_from_event_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.training_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  course_id uuid REFERENCES public.training_courses(id) ON DELETE CASCADE,
  user_id uuid,
  audience text,
  mandatory boolean NOT NULL DEFAULT false,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.bcp_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  plan_code text,
  name text,
  status text NOT NULL DEFAULT 'STANDBY',
  activated_by_incident text,
  activated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- heal-before-index: era versions of these tables may pre-exist with fewer
-- columns (CREATE IF NOT EXISTS is then a no-op).
ALTER TABLE public.bcp_plans
  ADD COLUMN IF NOT EXISTS org_id uuid DEFAULT current_user_org_id(),
  ADD COLUMN IF NOT EXISTS plan_code text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS activated_by_incident text,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;
ALTER TABLE public.evidence_chain
  ADD COLUMN IF NOT EXISTS org_id uuid DEFAULT current_user_org_id(),
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id text,
  ADD COLUMN IF NOT EXISTS action text,
  ADD COLUMN IF NOT EXISTS actor text,
  ADD COLUMN IF NOT EXISTS prev_hash text,
  ADD COLUMN IF NOT EXISTS hash text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.compliance_scores
  ADD COLUMN IF NOT EXISTS org_id uuid DEFAULT current_user_org_id(),
  ADD COLUMN IF NOT EXISTS framework text,
  ADD COLUMN IF NOT EXISTS score_delta numeric,
  ADD COLUMN IF NOT EXISTS trust_engine_delta numeric,
  ADD COLUMN IF NOT EXISTS recalculated_at timestamptz,
  ADD COLUMN IF NOT EXISTS caused_by_event_id text,
  ADD COLUMN IF NOT EXISTS gaps jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS status text;
ALTER TABLE public.transparency_reports
  ADD COLUMN IF NOT EXISTS org_id uuid DEFAULT current_user_org_id(),
  ADD COLUMN IF NOT EXISTS report_type text,
  ADD COLUMN IF NOT EXISTS audience text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS generated_by text,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS event_id text;
ALTER TABLE public.training_courses
  ADD COLUMN IF NOT EXISTS org_id uuid DEFAULT current_user_org_id(),
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS content_url text,
  ADD COLUMN IF NOT EXISTS estimated_minutes integer,
  ADD COLUMN IF NOT EXISTS generated_from_event_id text;
ALTER TABLE public.training_assignments
  ADD COLUMN IF NOT EXISTS org_id uuid DEFAULT current_user_org_id(),
  ADD COLUMN IF NOT EXISTS course_id uuid,
  ADD COLUMN IF NOT EXISTS audience text,
  ADD COLUMN IF NOT EXISTS mandatory boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS completed_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS ux_bcp_plans_org_code ON public.bcp_plans(org_id, plan_code);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'evidence_chain','compliance_scores','transparency_reports',
    'training_courses','training_assignments','bcp_plans'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_org_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      || 'USING (org_id = current_user_org_id()) '
      || 'WITH CHECK (org_id = current_user_org_id())',
      t || '_org_all', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Columns the cascade agents stamp on existing tables.
-- ---------------------------------------------------------------------------
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS commander_role text,
  ADD COLUMN IF NOT EXISTS classified_at timestamptz;
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS sla_breach_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_breach_at timestamptz,
  ADD COLUMN IF NOT EXISTS risk_score numeric;
ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS paused_reason text,
  ADD COLUMN IF NOT EXISTS paused_at timestamptz;
ALTER TABLE public.workflow_instances
  ADD COLUMN IF NOT EXISTS template_code text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id text,
  ADD COLUMN IF NOT EXISTS config jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 4. Latent scoping fixes from the group audit.
-- ---------------------------------------------------------------------------
ALTER TABLE public.regulation_entries
  ALTER COLUMN org_id SET DEFAULT current_user_org_id();
DO $$
BEGIN
  IF to_regclass('public.tabletop_exercises') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS tte_org ON public.tabletop_exercises';
    EXECUTE 'CREATE POLICY tte_org ON public.tabletop_exercises '
         || 'FOR ALL TO authenticated USING (org_id = current_user_org_id()) '
         || 'WITH CHECK (org_id = current_user_org_id())';
  END IF;
END $$;
