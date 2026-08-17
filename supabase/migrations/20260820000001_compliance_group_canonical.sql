-- 20260820000001_compliance_group_canonical.sql
--
-- COMPLIANCE & REGULATORY group (22 modules) onto the platform contract.
-- Closes the 2026-08-16 four-cluster audit:
--   * cross-tenant RLS holes: controls / evidence / policies ran allow_all;
--     8 anon-writable demo doc tables backed compliance-critical screens
--   * live-only schema drift: frameworks (score/controls_total/next_audit_at/
--     is_active/code/target_score), conformity (evidence_ids/certificate_url/
--     assessor_id), evidence.url — real pages break on a from-zero replay
--   * audit_log schema fork: flat 006 shape deployed, ws03 hash-chain columns
--     absent → audit_client_event silently no-oped; reconciled by adding the
--     ws03 columns as nullable and rewriting the RPC to write BOTH shapes
--   * evidence_chain was labelled append-only but FOR ALL let clients rewrite
--   * audits/audit_findings/documents/compliance_calendar were stubs while
--     their pages ran on hardcoded arrays
--   * no post-market (Art. 72) tables, no policy_templates catalog
-- Idempotent; heal-before-police throughout; no-op live where columns exist.

-- ---------------------------------------------------------------------------
-- 1. RLS: org-scope the three open core tables (same pattern as risks).
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['controls','evidence','policies'] LOOP
    EXECUTE format($h$ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default'$h$, t);
    EXECUTE format('UPDATE public.%I SET tenant_id = org_id::text WHERE org_id IS NOT NULL AND (tenant_id IS NULL OR tenant_id = %L)', t, 'default');
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', 'allow_all_' || t, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_org_scoped', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      || 'USING (tenant_id = (current_user_org_id())::text) '
      || 'WITH CHECK (tenant_id = (current_user_org_id())::text)',
      t || '_org_scoped', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT (current_user_org_id())::text', t);
  END LOOP;
END $$;
DROP POLICY IF EXISTS "allow_all_policies" ON public.policies;
DROP POLICY IF EXISTS "allow_all_controls" ON public.controls;
DROP POLICY IF EXISTS "allow_all_evidence" ON public.evidence;

-- ---------------------------------------------------------------------------
-- 2. Close the anon-writable demo doc tables (pages repointed in this change).
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'regulatorfilings_table','transparencyreports_table','regradar_table',
    'postmarket_table','complianceautopilot_table','compliancedashboard_table',
    'compliancecontrols_table','policyeditor_table','policies_table'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_anon_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_all', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Schema-drift heal: columns real pages read/write but no migration made.
-- ---------------------------------------------------------------------------
ALTER TABLE public.frameworks
  ADD COLUMN IF NOT EXISTS org_id uuid DEFAULT current_user_org_id(),
  ADD COLUMN IF NOT EXISTS code text,
  ADD COLUMN IF NOT EXISTS score numeric,
  ADD COLUMN IF NOT EXISTS target_score numeric,
  ADD COLUMN IF NOT EXISTS controls_total integer,
  ADD COLUMN IF NOT EXISTS controls_implemented integer,
  ADD COLUMN IF NOT EXISTS next_audit_at date,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.frameworks ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE public.controls
  ADD COLUMN IF NOT EXISTS control_ref text,
  ADD COLUMN IF NOT EXISTS clause_ref text,
  ADD COLUMN IF NOT EXISTS framework_id text,
  ADD COLUMN IF NOT EXISTS last_tested_at timestamptz,
  ADD COLUMN IF NOT EXISTS next_test_at timestamptz;

ALTER TABLE public.conformity_assessments
  ADD COLUMN IF NOT EXISTS evidence_ids text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS certificate_url text,
  ADD COLUMN IF NOT EXISTS assessor_id text;

ALTER TABLE public.evidence
  ADD COLUMN IF NOT EXISTS url text,
  ADD COLUMN IF NOT EXISTS linked_use_cases text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_incident_id uuid,
  ADD COLUMN IF NOT EXISTS linked_assessment_id text;

-- ---------------------------------------------------------------------------
-- 4. audit_log fork reconciliation. The deployed table is the flat 006 shape
--    (module/entity_*/actor_name); the ws03 hash-chain columns never existed
--    on it, so audit_log_append threw and audit_client_event returned NULL.
--    Add the ws03 columns as NULLABLE so both writers coexist, and rewrite
--    the client RPC to write BOTH shapes directly (org/actor forced
--    server-side). The service-role hash-chain appender keeps working where
--    its columns now exist.
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_log
  ADD COLUMN IF NOT EXISTS sequence_no bigint,
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS actor_type text,
  ADD COLUMN IF NOT EXISTS resource_type text,
  ADD COLUMN IF NOT EXISTS resource_id text,
  ADD COLUMN IF NOT EXISTS outcome text,
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS previous_hash text,
  ADD COLUMN IF NOT EXISTS row_hash text,
  ADD COLUMN IF NOT EXISTS ip_address inet,
  ADD COLUMN IF NOT EXISTS user_agent text,
  ADD COLUMN IF NOT EXISTS trace_id text;

CREATE OR REPLACE FUNCTION public.audit_client_event(
  p_action        text,
  p_resource_type text,
  p_resource_id   text DEFAULT NULL,
  p_outcome       text DEFAULT 'success',
  p_metadata      jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_org uuid;
  v_actor uuid;
  v_actor_name text;
  v_id uuid;
BEGIN
  v_org := current_user_org_id();
  IF v_org IS NULL THEN RETURN NULL; END IF;
  v_actor := auth.uid();
  SELECT COALESCE(raw_user_meta_data->>'full_name', email) INTO v_actor_name
    FROM auth.users WHERE id = v_actor;
  -- Write BOTH shapes: flat 006 columns (what the Audit Trail UI renders)
  -- and ws03 columns (action/resource/outcome/severity) in one row.
  INSERT INTO public.audit_log
    (org_id, actor_id, actor_name, actor_type, module, entity_type, entity_name,
     action, resource_type, resource_id, outcome, severity, metadata, occurred_at,
     new_values)
  VALUES
    (v_org, v_actor, COALESCE(v_actor_name, 'User'), 'user',
     split_part(p_action, '.', 1), p_resource_type, p_resource_id,
     p_action, p_resource_type, p_resource_id, p_outcome, 'notice', p_metadata, now(),
     p_metadata)
  RETURNING id INTO v_id;
  RETURN v_id;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'audit_client_event skipped: %', SQLERRM;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.audit_client_event(text, text, text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.audit_client_event(text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_client_event(text, text, text, text, jsonb) TO service_role;

-- ---------------------------------------------------------------------------
-- 5. evidence_chain: genuinely append-only (badge said so; policy didn't).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS evidence_chain_org_all ON public.evidence_chain;
DROP POLICY IF EXISTS evidence_chain_org_read ON public.evidence_chain;
DROP POLICY IF EXISTS evidence_chain_org_insert ON public.evidence_chain;
CREATE POLICY evidence_chain_org_read ON public.evidence_chain
  FOR SELECT TO authenticated USING (org_id = current_user_org_id());
CREATE POLICY evidence_chain_org_insert ON public.evidence_chain
  FOR INSERT TO authenticated WITH CHECK (org_id = current_user_org_id());
-- no UPDATE/DELETE policies → denied for authenticated (append-only)

-- ---------------------------------------------------------------------------
-- 6. Audit Management: real columns on the audits/audit_findings stubs.
-- ---------------------------------------------------------------------------
ALTER TABLE public.audits
  ADD COLUMN IF NOT EXISTS audit_ref text,
  ADD COLUMN IF NOT EXISTS audit_type text,          -- internal | external | certification | regulator
  ADD COLUMN IF NOT EXISTS framework text,
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS auditor text,             -- firm / body
  ADD COLUMN IF NOT EXISTS lead_auditor text,        -- role label, no personal data in seeds
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS end_date date,
  ADD COLUMN IF NOT EXISTS owner text,
  ADD COLUMN IF NOT EXISTS findings_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE public.audit_findings
  ADD COLUMN IF NOT EXISTS finding_ref text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS severity text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open',
  ADD COLUMN IF NOT EXISTS linked_control_id text,   -- → controls.id (text ids in this era)
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS owner text;
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['audits','audit_findings'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_org_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      || 'USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id())',
      t || '_org_all', t);
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET DEFAULT current_user_org_id()', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 7. Compliance Calendar: the aggregation point of the platform. Manual
--    entries live here; the service also DERIVES deadline events from
--    conformity valid_until, exception expiries, tabletop schedules,
--    filing deadlines and training end dates (source_type/source_id below).
-- ---------------------------------------------------------------------------
ALTER TABLE public.compliance_calendar
  ADD COLUMN IF NOT EXISTS due_at timestamptz,
  ADD COLUMN IF NOT EXISTS source_type text,          -- manual | conformity | exception | tabletop | filing | training
  ADD COLUMN IF NOT EXISTS source_id text,
  ADD COLUMN IF NOT EXISTS framework_ref text;
ALTER TABLE public.compliance_calendar ALTER COLUMN tenant_id SET DEFAULT (current_user_org_id())::text;
ALTER TABLE public.compliance_calendar ALTER COLUMN org_id SET DEFAULT current_user_org_id();

-- ---------------------------------------------------------------------------
-- 8. Policy backbone: global template catalog + versioned editing.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.policy_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_ref text UNIQUE,
  name text NOT NULL,
  category text,
  framework text,                                   -- display family, e.g. 'EU AI Act'
  clause_refs text[] NOT NULL DEFAULT '{}',         -- e.g. {Art. 9, Art. 17}
  description text,
  body jsonb NOT NULL DEFAULT '{}'::jsonb,          -- {summary, sections:[{heading, text}]}
  version text,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.policy_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_templates_catalog_read ON public.policy_templates;
CREATE POLICY policy_templates_catalog_read ON public.policy_templates
  FOR SELECT TO authenticated USING (true);          -- global catalog: read-all, service-role write
DROP POLICY IF EXISTS policy_templates_svc_all ON public.policy_templates;
CREATE POLICY policy_templates_svc_all ON public.policy_templates
  FOR ALL TO service_role USING (true) WITH CHECK (true);

ALTER TABLE public.policy_versions
  ADD COLUMN IF NOT EXISTS org_id uuid DEFAULT current_user_org_id();
ALTER TABLE public.policy_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_versions_org_all ON public.policy_versions;
CREATE POLICY policy_versions_org_all ON public.policy_versions
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id());

-- ---------------------------------------------------------------------------
-- 9. Post-market monitoring (EU AI Act Art. 72) — first real backend.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.post_market_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  plan_ref text,
  model_id uuid,                                    -- → ai_models.id
  name text NOT NULL,
  status text NOT NULL DEFAULT 'active',            -- active | paused | retired
  frequency text,                                   -- continuous | weekly | monthly | quarterly
  metrics jsonb NOT NULL DEFAULT '[]'::jsonb,       -- [{name, threshold, direction}]
  owner text,
  last_review date,
  next_review date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.post_market_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  plan_id uuid REFERENCES public.post_market_plans(id) ON DELETE CASCADE,
  incident_id uuid,                                 -- → incidents.id when escalated
  severity text,
  event_type text,                                  -- metric_breach | complaint | drift | recall_check
  description text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  resolved boolean NOT NULL DEFAULT false
);
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['post_market_plans','post_market_events'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_org_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      || 'USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id())',
      t || '_org_all', t);
  END LOOP;
END $$;
CREATE INDEX IF NOT EXISTS idx_pmm_plans_model ON public.post_market_plans(model_id);
CREATE INDEX IF NOT EXISTS idx_pmm_events_plan ON public.post_market_events(plan_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- 10. Transparency reports: interlink columns for the mesh-written table.
-- ---------------------------------------------------------------------------
ALTER TABLE public.transparency_reports
  ADD COLUMN IF NOT EXISTS model_id uuid,
  ADD COLUMN IF NOT EXISTS version text,
  ADD COLUMN IF NOT EXISTS published_at timestamptz,
  ADD COLUMN IF NOT EXISTS url text;

-- ---------------------------------------------------------------------------
-- 11. Control drift: the columns the Python drift detector writes, and
--     tenancy defaults for control_tests / control_evaluation_history.
-- ---------------------------------------------------------------------------
ALTER TABLE public.control_evaluation_history
  ADD COLUMN IF NOT EXISTS drift_severity text,
  ADD COLUMN IF NOT EXISTS drift_delta_pct numeric;
ALTER TABLE public.control_evaluation_history ALTER COLUMN tenant_id SET DEFAULT (current_user_org_id())::text;
DO $$
BEGIN
  IF to_regclass('public.control_tests') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.control_tests ADD COLUMN IF NOT EXISTS org_id uuid DEFAULT current_user_org_id()';
    EXECUTE 'ALTER TABLE public.control_tests ENABLE ROW LEVEL SECURITY';
    EXECUTE 'DROP POLICY IF EXISTS control_tests_org_all ON public.control_tests';
    EXECUTE 'CREATE POLICY control_tests_org_all ON public.control_tests FOR ALL TO authenticated '
         || 'USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id())';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 12. Documents: real columns for the artifact library (was a 5-column stub).
-- ---------------------------------------------------------------------------
ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS doc_type text,
  ADD COLUMN IF NOT EXISTS version text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS owner text,
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS frameworks text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS expiry_date date,
  ADD COLUMN IF NOT EXISTS external_link text,
  ADD COLUMN IF NOT EXISTS storage_path text,
  ADD COLUMN IF NOT EXISTS file_size bigint,
  ADD COLUMN IF NOT EXISTS linked_entity_type text,
  ADD COLUMN IF NOT EXISTS linked_entity_id text,
  ADD COLUMN IF NOT EXISTS linked_model_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.documents ALTER COLUMN tenant_id SET DEFAULT (current_user_org_id())::text;
