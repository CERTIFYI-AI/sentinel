-- 20260819000001_risk_incidents_canonical.sql
--
-- RISK & INCIDENTS group (Risk Register/Matrix/Intelligence/Financial ·
-- Incidents/Workflow/Playbooks/Tabletop/Remediation/Exceptions ·
-- HITL/Approvals/Automation) onto the platform contract (CLAUDE.md):
-- real org-scoped tables with RLS, one model id-space (ai_models.id uuid),
-- no anon-writable demo tables behind governance-critical screens.
--
-- Audit findings this closes (2026-08-16 risk-incidents audit):
--   * risks queried columns (categories, deadline, risk_score) existed only
--     on the live DB — created here so a from-zero replay serves /risks
--   * risks/incidents/hitl_reviews ran on allow_all RLS policies in-repo;
--     the org-scoped policies existed live-only — versioned here
--   * hitl_reviews had NO org_id column, so every HITLAgent/dispatcher
--     insert (which passes org_id) failed silently — the mesh's human
--     escalations were being discarded
--   * approvals (baseline) had no org scoping, no status/requester columns,
--     and a uuid entity_id that cannot reference text-keyed entities
--   * no playbooks / playbook runs / financial risk / automation tables
--     existed at all; Playbooks, Financial Risk and Automation Studio were
--     hardcoded or doc-jsonb demoware
--   * incident_workflow_steps was a 4-column stub with nowhere to persist
--     the Workflow page's state machine
--   * pages wired to anon-open doc-jsonb demo tables (incidentlog_table,
--     incidentworkflow_table, tabletopexercises_table, hitlreviewcenter_table,
--     approvalworkflows_table, automationstudio_table, financialrisk_table)
--     — anon policies dropped here
-- Idempotent; safe to re-run; no-op columns on the live DB where they exist.

-- ---------------------------------------------------------------------------
-- 1. Risk Register — heal the live-only columns and version the org policy.
-- ---------------------------------------------------------------------------
ALTER TABLE public.risks
  ADD COLUMN IF NOT EXISTS categories text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS deadline date,
  ADD COLUMN IF NOT EXISTS risk_score integer;

-- The ws09 seed populated org_id but not tenant_id, leaving 80 demo rows
-- invisible to the tenant-scoped reads. Heal: tenant follows org.
UPDATE public.risks SET tenant_id = org_id::text
 WHERE org_id IS NOT NULL AND (tenant_id IS NULL OR tenant_id = 'default');
UPDATE public.incidents SET tenant_id = org_id::text
 WHERE org_id IS NOT NULL AND (tenant_id IS NULL OR tenant_id = 'default');

-- Version the org-scoped policies (live-only until now; replaces allow_all).
DROP POLICY IF EXISTS "allow_all_risks" ON public.risks;
DROP POLICY IF EXISTS risks_org_scoped ON public.risks;
CREATE POLICY risks_org_scoped ON public.risks
  FOR ALL TO authenticated
  USING (tenant_id = (current_user_org_id())::text)
  WITH CHECK (tenant_id = (current_user_org_id())::text);

DROP POLICY IF EXISTS "allow_all_incidents" ON public.incidents;
DROP POLICY IF EXISTS incidents_org_scoped ON public.incidents;
CREATE POLICY incidents_org_scoped ON public.incidents
  FOR ALL TO authenticated
  USING (tenant_id = (current_user_org_id())::text)
  WITH CHECK (tenant_id = (current_user_org_id())::text);

-- ---------------------------------------------------------------------------
-- 2. Risk Intelligence — regulation_entries becomes the real backing store
--    (it was purpose-built for this and had zero consumers).
-- ---------------------------------------------------------------------------
ALTER TABLE public.regulation_entries
  ADD COLUMN IF NOT EXISTS regulation_ref text,
  ADD COLUMN IF NOT EXISTS effective_on date,      -- typed date; legacy effective_date is text
  ADD COLUMN IF NOT EXISTS obligations jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS linked_model_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS linked_risk_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS owner text;

-- ---------------------------------------------------------------------------
-- 3. Financial Risk — real FAIR-quantification table (was doc-jsonb demo).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.financial_risks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  fin_ref text,                                    -- business code, e.g. FRQ-2026-001
  title text NOT NULL,
  scenario text,
  model_id uuid,                                   -- → ai_models.id
  linked_risk_id uuid,                             -- → risks.id
  category text,                                   -- model_failure | bias_discrimination | data_breach | ...
  methodology text NOT NULL DEFAULT 'FAIR',
  loss_event_frequency numeric,                    -- events / year
  loss_magnitude numeric,                          -- expected loss per event
  probability numeric,                             -- 0..1 annual occurrence probability
  single_loss_expectancy numeric,
  annualized_loss_expectancy numeric,
  exposure numeric,                                -- worst-case exposure
  currency text NOT NULL DEFAULT 'USD',
  owner text,
  status text NOT NULL DEFAULT 'draft',            -- draft | quantified | accepted | mitigating
  last_quantified date,
  controls jsonb NOT NULL DEFAULT '[]'::jsonb,     -- [{name, annual_cost, risk_reduction_pct}]
  insurance jsonb NOT NULL DEFAULT '{}'::jsonb,    -- {policy, carrier, coverage, deductible}
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.financial_risks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS financial_risks_org_all ON public.financial_risks;
CREATE POLICY financial_risks_org_all ON public.financial_risks
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());
CREATE INDEX IF NOT EXISTS idx_financial_risks_org ON public.financial_risks(org_id);
CREATE INDEX IF NOT EXISTS idx_financial_risks_model ON public.financial_risks(model_id);

-- ---------------------------------------------------------------------------
-- 4. Incidents — workflow + playbook + model interlink columns.
-- ---------------------------------------------------------------------------
ALTER TABLE public.incidents
  ADD COLUMN IF NOT EXISTS sla_hours integer,
  ADD COLUMN IF NOT EXISTS playbook_id uuid,       -- → incident_playbooks.id
  ADD COLUMN IF NOT EXISTS model_id uuid;          -- primary affected model → ai_models.id

-- The Workflow page's state machine persists each transition here. The
-- baseline stub had only (id, org_id, incident_id, created_at).
ALTER TABLE public.incident_workflow_steps
  ADD COLUMN IF NOT EXISTS from_status text,
  ADD COLUMN IF NOT EXISTS to_status text,
  ADD COLUMN IF NOT EXISTS actor text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS occurred_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.incident_workflow_steps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS incident_workflow_steps_org_all ON public.incident_workflow_steps;
CREATE POLICY incident_workflow_steps_org_all ON public.incident_workflow_steps
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());
CREATE INDEX IF NOT EXISTS idx_iws_incident ON public.incident_workflow_steps(incident_id, occurred_at DESC);

-- ---------------------------------------------------------------------------
-- 5. Playbooks — first real backend (page was hardcoded constants).
--    tabletop_exercises.linked_playbook_id (dangling since 040) now has a
--    target.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.incident_playbooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  playbook_ref text,                               -- business code, e.g. PB-001
  name text NOT NULL,
  category text,                                   -- model_failure | bias | data_breach | ...
  description text,
  phases jsonb NOT NULL DEFAULT '[]'::jsonb,       -- [{name, steps:[{text, role}], sla_minutes}]
  escalation_chain jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{tier, role, contact_channel}]
  regulatory_templates jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{authority, regulation, deadline_hours}]
  status text NOT NULL DEFAULT 'active',           -- active | draft | archived
  version text,
  last_tested_date date,
  owner text,
  linked_model_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.incident_playbooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS incident_playbooks_org_all ON public.incident_playbooks;
CREATE POLICY incident_playbooks_org_all ON public.incident_playbooks
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

-- Activations: a playbook run against a real incident (the page's
-- "active incident" banner is driven by open runs — honest empty state
-- when there are none).
CREATE TABLE IF NOT EXISTS public.playbook_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  playbook_id uuid REFERENCES public.incident_playbooks(id) ON DELETE CASCADE,
  incident_id text REFERENCES public.incidents(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'active',           -- active | completed | aborted
  current_phase text,
  commander text,
  severity text,
  completed_steps jsonb NOT NULL DEFAULT '[]'::jsonb, -- ["<phase>:<step index>", ...]
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  notes text
);
ALTER TABLE public.playbook_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS playbook_runs_org_all ON public.playbook_runs;
CREATE POLICY playbook_runs_org_all ON public.playbook_runs
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());
CREATE INDEX IF NOT EXISTS idx_playbook_runs_incident ON public.playbook_runs(incident_id);

-- ---------------------------------------------------------------------------
-- 6. Tabletop — the real org-scoped table gains the fields the page needs
--    (it had zero consumers while the page wrote a doc-jsonb demo table).
-- ---------------------------------------------------------------------------
ALTER TABLE public.tabletop_exercises
  ADD COLUMN IF NOT EXISTS facilitator text,       -- display name; facilitator_id uuid remains for auth-linked orgs
  ADD COLUMN IF NOT EXISTS participant_names text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS readiness_score numeric,
  ADD COLUMN IF NOT EXISTS narrative text,
  ADD COLUMN IF NOT EXISTS injects jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS scoring jsonb NOT NULL DEFAULT '{}'::jsonb;

-- ---------------------------------------------------------------------------
-- 7. Remediation — CRUD-able tracker with real interlinks.
-- ---------------------------------------------------------------------------
ALTER TABLE public.remediation_plans
  -- heal-before-police: era unify loops strip tenant_id on a fresh replay
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS start_date date,
  ADD COLUMN IF NOT EXISTS risk_id uuid,           -- → risks.id
  ADD COLUMN IF NOT EXISTS assignee text,
  ADD COLUMN IF NOT EXISTS linked_model_ids uuid[] NOT NULL DEFAULT '{}';
ALTER TABLE public.remediation_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS remediation_plans_org_all ON public.remediation_plans;
CREATE POLICY remediation_plans_org_all ON public.remediation_plans
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

-- ---------------------------------------------------------------------------
-- 8. Exceptions — the real table gains the governance fields the page
--    manages (approval chain, renewals, framework mapping, risk link).
-- ---------------------------------------------------------------------------
ALTER TABLE public.exceptions
  ADD COLUMN IF NOT EXISTS policy_ref text,
  ADD COLUMN IF NOT EXISTS likelihood integer,
  ADD COLUMN IF NOT EXISTS impact integer,
  ADD COLUMN IF NOT EXISTS risk_score integer,
  ADD COLUMN IF NOT EXISTS compensating_controls text,
  ADD COLUMN IF NOT EXISTS impact_scope text,
  ADD COLUMN IF NOT EXISTS framework_mapping text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS regulatory_ref text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS affected_systems text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS approval_chain jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS renewal_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS approver text,
  ADD COLUMN IF NOT EXISTS requested_date date,
  ADD COLUMN IF NOT EXISTS review_date date,
  ADD COLUMN IF NOT EXISTS linked_risk_id uuid,
  ADD COLUMN IF NOT EXISTS linked_model_ids uuid[] NOT NULL DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- 9. HITL — hitl_reviews becomes what the agents already write to.
--    org_id did not exist, so agent inserts (which pass org_id) failed
--    silently; blocks_deployment was never persisted.
-- ---------------------------------------------------------------------------
ALTER TABLE public.hitl_reviews
  -- heal-before-police: April-era unify loops strip tenant_id on a fresh
  -- replay; the live DB always has it (no-op there).
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS reason text,            -- agent-written trigger summary
  ADD COLUMN IF NOT EXISTS blocks_deployment boolean NOT NULL DEFAULT false;
UPDATE public.hitl_reviews SET tenant_id = org_id::text
 WHERE org_id IS NOT NULL AND (tenant_id IS NULL OR tenant_id = 'default');
UPDATE public.hitl_reviews SET org_id = tenant_id::uuid
 WHERE org_id IS NULL AND tenant_id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DROP POLICY IF EXISTS "allow_all_hitl" ON public.hitl_reviews;
DROP POLICY IF EXISTS hitl_reviews_org_scoped ON public.hitl_reviews;
CREATE POLICY hitl_reviews_org_scoped ON public.hitl_reviews
  FOR ALL TO authenticated
  USING (tenant_id = (current_user_org_id())::text)
  WITH CHECK (tenant_id = (current_user_org_id())::text);

-- ---------------------------------------------------------------------------
-- 10. Approvals — entity-linked decision records. The baseline table had
--     (entity_type, entity_id uuid, decision, approver_id) only; text-keyed
--     entities (exceptions, tasks) could not be referenced at all.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'approvals'
       AND column_name = 'entity_id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE public.approvals ALTER COLUMN entity_id TYPE text USING entity_id::text;
  END IF;
END $$;

ALTER TABLE public.approvals
  ADD COLUMN IF NOT EXISTS org_id uuid DEFAULT current_user_org_id(),
  ADD COLUMN IF NOT EXISTS entity_name text,
  ADD COLUMN IF NOT EXISTS workflow_id uuid,       -- → approval_workflows.id (definition applied)
  ADD COLUMN IF NOT EXISTS requested_by text,
  ADD COLUMN IF NOT EXISTS requested_action text,  -- e.g. promote_to_production
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  ADD COLUMN IF NOT EXISTS reason text,
  ADD COLUMN IF NOT EXISTS approver text,
  ADD COLUMN IF NOT EXISTS step_index integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS decided_at timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.approvals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS approvals_org_all ON public.approvals;
CREATE POLICY approvals_org_all ON public.approvals
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());
CREATE INDEX IF NOT EXISTS idx_approvals_entity ON public.approvals(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_approvals_status ON public.approvals(org_id, status);

-- Workflow definitions: steps, MFA and escalation config become real columns.
ALTER TABLE public.approval_workflows
  ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default',
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id text,
  ADD COLUMN IF NOT EXISTS entity_name text,
  ADD COLUMN IF NOT EXISTS workflow_type text,
  ADD COLUMN IF NOT EXISTS status text,
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS applies_to text,        -- model_release | exception | incident | policy | ...
  ADD COLUMN IF NOT EXISTS steps jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{name, approver_role, required, sla_hours}]
  ADD COLUMN IF NOT EXISTS requires_mfa boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS escalation_hours integer,
  ADD COLUMN IF NOT EXISTS notify_on_escalation boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;
ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS approval_workflows_org ON public.approval_workflows;
CREATE POLICY approval_workflows_org ON public.approval_workflows
  FOR ALL TO authenticated
  USING (tenant_id = (current_user_org_id())::text)
  WITH CHECK (tenant_id = (current_user_org_id())::text);

-- ---------------------------------------------------------------------------
-- 11. Automation Studio — real rules + run log (was doc-jsonb demo with a
--     Math.random() fake execution engine).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  rule_ref text,                                   -- business code, e.g. AUTO-001
  name text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'draft',            -- draft | active | paused
  trigger_type text,                               -- incident_created | model_drift | approval_required | schedule | manual
  trigger_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  actions jsonb NOT NULL DEFAULT '[]'::jsonb,      -- ordered [{type, config}]
  run_count integer NOT NULL DEFAULT 0,
  last_run_at timestamptz,
  last_run_status text,
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS automation_rules_org_all ON public.automation_rules;
CREATE POLICY automation_rules_org_all ON public.automation_rules
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

CREATE TABLE IF NOT EXISTS public.automation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  rule_id uuid REFERENCES public.automation_rules(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'completed',        -- completed | failed | validated
  trigger_source text,                             -- event | schedule | manual_validation
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  actions_run integer,
  log jsonb NOT NULL DEFAULT '[]'::jsonb,
  error text
);
ALTER TABLE public.automation_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS automation_runs_org_all ON public.automation_runs;
CREATE POLICY automation_runs_org_all ON public.automation_runs
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());
CREATE INDEX IF NOT EXISTS idx_automation_runs_rule ON public.automation_runs(rule_id, started_at DESC);

-- ---------------------------------------------------------------------------
-- 12. Close the anon-writable demo doc tables (pages are repointed to the
--     canonical tables in the same change; demo tables become deny-all).
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'incidentlog_table','incidentworkflow_table','tabletopexercises_table',
    'hitlreviewcenter_table','approvalworkflows_table','automationstudio_table',
    'financialrisk_table'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_anon_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_all', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 13. Scoping defaults so client writes never carry the scoping column.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  -- tenant_id text columns follow the risks pattern (20260814000008)
  FOREACH t IN ARRAY ARRAY[
    'incidents','hitl_reviews','approval_workflows','regulation_entries','exceptions'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id') THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT (current_user_org_id())::text', t);
    END IF;
  END LOOP;
  -- org_id uuid columns
  FOREACH t IN ARRAY ARRAY[
    'incidents','risks','hitl_reviews','remediation_plans','exceptions',
    'incident_workflow_steps','tabletop_exercises'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_schema = 'public' AND table_name = t AND column_name = 'org_id') THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET DEFAULT current_user_org_id()', t);
    END IF;
  END LOOP;
END $$;
