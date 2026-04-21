-- ================================================================
-- WS0.1 rollback — reverses Phase A, B, C, and quarantine.
--
-- IMPORTANT: rollback is lossy. The original tenant_id text values
-- were dropped in Phase A. This script re-creates tenant_id and
-- copies org_id::text back; clients that parsed tenant_id as a
-- non-uuid string will NOT recover.
--
-- Run in exactly one direction: Phase C → B → A → quarantine.
-- ================================================================

BEGIN;

-- C. Drop ws01_* policies and the helper.
DO $$
DECLARE p record;
BEGIN
  FOR p IN
    SELECT schemaname, tablename, policyname FROM pg_policies
     WHERE schemaname='public' AND policyname LIKE 'ws01_%'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;',
      p.policyname, p.schemaname, p.tablename);
  END LOOP;
END $$;
DROP FUNCTION IF EXISTS auth.current_org_id();

-- B. Drop added audit columns + org_id where parent-scoped.
DO $$
DECLARE
  t text;
  b1_tables text[] := ARRAY[
    'document_versions','incident_workflow_steps','workflow_step_actions',
    'event_cascade_links','audit_findings','vendor_questionnaires',
    'training_assignments','observability_metrics','module_health'
  ];
BEGIN
  FOREACH t IN ARRAY b1_tables LOOP
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;',
      t, t || '_org_id_fkey');
    EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS org_id;', t);
  END LOOP;
END $$;

-- A. Re-add tenant_id column (text), copy org_id back, drop org_id.
DO $$
DECLARE
  t text;
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
  FOREACH t IN ARRAY target_tables LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id text;', t);
    EXECUTE format('UPDATE public.%I SET tenant_id = org_id::text WHERE tenant_id IS NULL;', t);
    EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;',
      t, t || '_org_id_fkey');
    EXECUTE format('ALTER TABLE public.%I DROP COLUMN IF EXISTS org_id;', t);
  END LOOP;
END $$;

-- Quarantine reversal.
DO $$
DECLARE
  t text;
  legacy_tables text[] := ARRAY[
    'Agent','AuditLog','BiasAudit','ComplianceEvent','Control','Dataset',
    'Evidence','Framework','GuardrailRule','HitlItem','Model','ModelTrustConfig',
    'Notification','ObservabilityMetric','Policy','PolicyVersion','RBACRole',
    'RBACUser','Regulation','RiskEntry','ShadowAIFinding','Tenant','TrustTrace',
    'User','Vendor','VendorQuestionnaire'
  ];
BEGIN
  FOREACH t IN ARRAY legacy_tables LOOP
    EXECUTE format('DROP VIEW IF EXISTS public.%I;', t);
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name='_deprecated_'||t) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I;',
        '_deprecated_'||t, t);
    END IF;
  END LOOP;
END $$;

COMMIT;
