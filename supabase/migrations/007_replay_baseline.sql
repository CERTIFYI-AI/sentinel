-- 007_replay_baseline.sql
--
-- WHY THIS FILE EXISTS
-- The live Supabase project accumulated ~50 tables that were created
-- out-of-band (Supabase MCP / dashboard) and never committed as migrations.
-- Every from-zero replay (`supabase db reset`, the schema-drift CI job, any
-- new contributor's first day) died on the first reference to one of them.
--
-- This baseline recreates those tables with IF NOT EXISTS so that:
--   * on the LIVE database it is a complete no-op (every table exists), and
--   * on a FRESH database the rest of the migration history can replay.
--
-- Column definitions are derived from every later migration that writes to
-- these tables plus the dashboard service layer that reads them. They are a
-- faithful *approximation* of the live schema, not a dump of it — before the
-- repo goes public, generate the real baseline with
--   supabase db dump --linked -f supabase/migrations/<ts>_live_baseline.sql
-- and delete this file in the same change. See supabase/migrations/README.md.
--
-- Also defines current_user_org_id() early: files that sort before
-- 20260813000013_repo_org_resolver.sql already call it (evals org isolation,
-- audit_log default, close_anon_rls), which broke replay the same way.

-- Org resolver (matches 20260813000013_repo_org_resolver.sql exactly; that file
-- re-applies the same definition as a safe no-op).
create or replace function public.current_user_org_id() returns uuid language sql stable security definer set search_path='' as $$ select org_id from public.user_profiles where id = auth.uid() limit 1; $$;

-- auth.current_org_id() also exists only on the live database (created
-- out-of-band); 20260421000006_phase4_foundation.sql and later files use it
-- in policies. Same resolution semantics as current_user_org_id().
create or replace function auth.current_org_id() returns uuid language sql stable security definer as $$ select org_id from public.user_profiles where id = auth.uid() limit 1; $$;

-- ---------------------------------------------------------------------------
-- Event bus core (definitions from migrations/002 + 003, the pre-Supabase
-- home of these tables; later mesh migrations ALTER them into final shape).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS governance_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid REFERENCES organizations(id),
  event_type      text NOT NULL,
  source_module   text NOT NULL,
  payload         jsonb NOT NULL DEFAULT '{}',
  triggered_agents text[] DEFAULT '{}',
  status          text DEFAULT 'pending',
  processed_at    timestamptz,
  created_at      timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gov_events_org ON governance_events(org_id);
CREATE INDEX IF NOT EXISTS idx_gov_events_type ON governance_events(event_type);
CREATE INDEX IF NOT EXISTS idx_gov_events_status ON governance_events(status);

CREATE TABLE IF NOT EXISTS agent_registry (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid REFERENCES organizations(id),
  agent_name          text NOT NULL,
  agent_type          text,
  status              text DEFAULT 'active',
  trigger_events      text[] NOT NULL DEFAULT '{}',
  target_modules      text[] NOT NULL DEFAULT '{}',
  is_enabled          boolean DEFAULT true,
  priority            integer DEFAULT 5,
  last_execution_at   timestamptz,
  avg_execution_ms    integer DEFAULT 0,
  error_rate          numeric DEFAULT 0,
  total_executions    integer DEFAULT 0,
  total_errors        bigint DEFAULT 0,
  sla_ms              integer,
  description         text,
  owner_team          text,
  runbook_url         text,
  dlq_threshold       integer,
  created_at          timestamptz DEFAULT now()
);

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE governance_events;
EXCEPTION WHEN duplicate_object THEN NULL;
        WHEN undefined_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- ws09 support tables (verbatim from 20260421000021_ws09_seed_support.sql, which
-- sorts AFTER 20260421000020_ws09_seed.sql and therefore ran too late on replay).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.demo_users (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  email text NOT NULL,
  full_name text NOT NULL,
  primary_role text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS public.framework_bindings (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  framework_slug text NOT NULL,
  framework_name text NOT NULL,
  scope text NOT NULL DEFAULT 'in_scope',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  UNIQUE (org_id, framework_slug)
);

CREATE TABLE IF NOT EXISTS public.training_assignments (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  course_slug text NOT NULL,
  status text NOT NULL,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz
);

-- user_profiles gained an auth-mapping column on the live DB that
-- 20260420160000_org_modules_full_wire.sql's get_org_id() reads.
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS user_id uuid;

-- ---------------------------------------------------------------------------
-- Live-only tables, derived from later migrations + the service layer.
-- (agent_gov_registry / agent_gov_credentials are intentionally NOT here:
--  they are doc-era tables created canonically by 20260702000001 — creating
--  them earlier lets the ws02 org-unify sweep mangle their tenant shape.)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agent_workflows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  name text,
  description text,
  status text,
  agents jsonb,
  steps jsonb,
  triggers jsonb,
  owner text,
  last_run_at timestamptz,
  last_run_status text,
  run_count numeric,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_impact_assessments (
  id text PRIMARY KEY,
  tenant_id text,
  assessment_id text,
  title text,
  assessment_type text,
  model_id uuid,
  use_case_id text,
  risk_level text,
  status text,
  progress_pct numeric,
  assessor_id text,
  reviewer_id text,
  summary text,
  affected_entities text[],
  rag_status text,
  findings jsonb,
  mitigations jsonb,
  approved_at timestamptz,
  next_review date,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fairness_score numeric,
  drift_status text,
  drift_score numeric,
  org_id uuid,
  name text,
  slug text,
  description text,
  model_type text,
  provider text,
  version text,
  lifecycle_stage text,
  risk_tier text,
  use_case text,
  business_owner text,
  framework text,
  eu_ai_act_category text,
  is_regulated boolean,
  risk_score numeric,
  trust_score numeric,
  technical_owner text,
  tags text[],
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ai_risk_tiering (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  system_id uuid,
  system_name text,
  risk_tier text,
  risk_score numeric,
  use_case text,
  affected_users text,
  fundamental_rights_impact text,
  classification_basis text,
  classifier text,
  classified_at timestamptz,
  review_due_at timestamptz,
  status text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key_hash text,
  last_used_at timestamptz,
  scopes text[],
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text,
  entity_id uuid,
  decision text,
  approver_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  audit_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  tenant_id text,
  title text,
  status text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bias_audit_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text,
  org_id text,
  doc jsonb,
  state text,
  model_id text,
  version numeric,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conformity_assessments (
  id text PRIMARY KEY,
  org_id uuid,
  title text,
  description text,
  status text,
  type text,
  severity text,
  owner text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tenant_id text,
  assessment_id text,
  model_id text,
  framework_id text,
  assessment_body text,
  compliance_level text,
  findings jsonb,
  valid_until timestamptz
);

CREATE TABLE IF NOT EXISTS consent_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  title text,
  description text,
  status text,
  type text,
  severity text,
  owner text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tenant_id text,
  consent_ref text,
  subject_ref text,
  legal_basis text,
  purposes text[],
  consent_date date,
  expiry_date date
);

CREATE TABLE IF NOT EXISTS cost_token_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  usage_date date,
  model_id text,
  model_name text,
  prompt_tokens numeric,
  completion_tokens numeric,
  total_tokens numeric,
  cost_usd numeric,
  request_count numeric,
  budget_limit_usd numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS dataset_catalog_entries (
  id text PRIMARY KEY,
  tenant_id text,
  org_id text,
  doc jsonb,
  state text,
  model_id text,
  version numeric,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  head_user_id uuid,
  parent_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS document_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  document_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  uri text,
  mime_type text,
  created_at timestamptz DEFAULT now(),
  tenant_id text
);

CREATE TABLE IF NOT EXISTS dsar_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  title text,
  description text,
  status text,
  type text,
  severity text,
  owner text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  requester_name text,
  requester_email text,
  request_type text,
  priority text,
  due_date date,
  notes text,
  dataset_id text,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS eval_monitoring_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text,
  org_id text,
  doc jsonb,
  state text,
  version numeric,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS exceptions (
  id text PRIMARY KEY,
  org_id uuid,
  title text,
  description text,
  status text,
  type text,
  severity text,
  owner text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tenant_id text,
  exception_id text,
  requested_by text,
  risk_accepted text,
  justification text,
  expiry_date date,
  renewal_count numeric
);

CREATE TABLE IF NOT EXISTS explainability_profiles (
  id text PRIMARY KEY,
  tenant_id text,
  org_id text,
  doc jsonb,
  state text,
  model_id text,
  version numeric,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS fallback_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_model_id uuid,
  fallback_model_id uuid,
  trace_id uuid,
  org_id uuid,
  primary_model text,
  fallback_model text,
  trigger_reason text,
  request_id text,
  latency_ms numeric,
  succeeded boolean,
  error_message text,
  occurred_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS genai_risk_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text,
  org_id text,
  doc jsonb,
  state text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guardrail_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  policy_id text,
  model_id uuid,
  action text,
  severity text,
  latency_ms numeric,
  status text,
  ack_by text,
  ack_at timestamptz,
  ack_reason text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS guardrails (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule jsonb,
  breach_count integer,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS incident_workflow_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  incident_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS kill_switch_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  agent_id uuid,
  agent_name text,
  triggered_by text,
  trigger_type text,
  reason text,
  severity text,
  status text,
  affected_systems jsonb,
  metadata jsonb,
  triggered_at timestamptz,
  resolved_by text,
  resolved_at timestamptz,
  resolution_notes text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS live_traces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  trace_ref text,
  model_id uuid,
  action text,
  status text,
  tokens_in numeric,
  tokens_out numeric,
  latency_ms numeric,
  cost_usd numeric,
  policy_id text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS maturity_assessments (
  id text PRIMARY KEY,
  org_id uuid,
  title text,
  description text,
  status text,
  type text,
  severity text,
  owner text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tenant_id text,
  assessment_id text,
  assessment_date timestamptz,
  overall_level numeric,
  overall_target numeric
);

CREATE TABLE IF NOT EXISTS metric_profiles (
  id text PRIMARY KEY,
  tenant_id text,
  org_id text,
  doc jsonb,
  state text,
  model_id text,
  version numeric,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_dna (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  model_id text,
  model_name text,
  base_model text,
  fingerprint_hash text,
  lineage jsonb,
  metadata jsonb,
  training_dataset text,
  training_method text,
  fine_tuning_method text,
  parameters_count text,
  context_window text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_lifecycle_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  model_id text,
  model_name text,
  current_stage text,
  gate_status text,
  gate_reviewer text,
  gate_notes text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS model_performance_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  model_id text,
  model_name text,
  recorded_at timestamptz,
  latency_p50 numeric,
  latency_p99 numeric,
  throughput numeric,
  accuracy numeric,
  error_rate numeric,
  drift_score numeric,
  cost_per_inference numeric,
  request_count numeric,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mrc_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  agenda_item_id uuid,
  agenda_item_title text,
  model_id uuid,
  voter_id text,
  voter_name text,
  vote text,
  rationale text,
  voted_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prompt_registry (
  id text PRIMARY KEY,
  version text,
  content text,
  used_by_model_ids text[],
  tenant_id text,
  name text,
  category text,
  status text,
  model text,
  owner text,
  current_version text,
  description text,
  tags jsonb,
  used_by text,
  token_count numeric,
  versions jsonb,
  approved_by text,
  approval_date timestamptz,
  last_modified timestamptz,
  created_date timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS protected_attribute_catalog (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text,
  org_id text,
  doc jsonb,
  state text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS red_team_campaigns (
  id text PRIMARY KEY,
  org_id uuid,
  title text,
  description text,
  status text,
  type text,
  severity text,
  owner text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tenant_id text,
  campaign_id text,
  name text,
  target_model_id text,
  attack_types text[],
  findings_count numeric,
  success_rate numeric,
  started_at timestamptz,
  completed_at timestamptz
);

CREATE TABLE IF NOT EXISTS red_team_findings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS remediation_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid,
  due_date timestamptz,
  org_id uuid,
  title text,
  description text,
  status text,
  type text,
  severity text,
  owner text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tenant_id text,
  plan_ref text,
  source_type text,
  source_id text,
  priority text,
  progress_pct numeric,
  milestones jsonb
);

CREATE TABLE IF NOT EXISTS risk_register (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  title text,
  category text,
  likelihood numeric,
  impact numeric,
  risk_score numeric,
  status text,
  owner text,
  mitigation text,
  tags text[],
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scenario_campaigns (
  id text PRIMARY KEY,
  tenant_id text,
  org_id text,
  doc jsonb,
  state text,
  model_id text,
  version numeric,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS scenario_templates (
  id text PRIMARY KEY,
  tenant_id text,
  org_id text,
  doc jsonb,
  state text,
  model_id text,
  version numeric,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS security_scans (
  id text PRIMARY KEY,
  org_id uuid,
  title text,
  description text,
  status text,
  type text,
  severity text,
  owner text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tenant_id text,
  scan_id text,
  scan_type text,
  target text,
  findings_count numeric,
  critical_count numeric,
  high_count numeric,
  medium_count numeric,
  low_count numeric,
  started_at timestamptz,
  completed_at timestamptz,
  initiated_by text
);

CREATE TABLE IF NOT EXISTS security_threats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  title text,
  description text,
  status text,
  type text,
  severity text,
  owner text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tenant_id text,
  threat_id text,
  threat_type text,
  source text,
  affected_models text,
  mitigation text
);

CREATE TABLE IF NOT EXISTS security_vulnerabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  title text,
  description text,
  status text,
  type text,
  severity text,
  owner text,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  tenant_id text,
  vuln_id text,
  cvss_score text,
  affected_component text,
  affected_model_id text,
  remediation text,
  discovered_at timestamptz
);

CREATE TABLE IF NOT EXISTS session_traces (
  id text PRIMARY KEY,
  tenant_id text,
  org_id text,
  doc jsonb,
  state text,
  model_id text,
  version numeric,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tool_call_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id uuid,
  trace_id uuid,
  org_id uuid,
  agent_id text,
  agent_name text,
  tool_name text,
  invocation_id text,
  arguments jsonb,
  result jsonb,
  status text,
  latency_ms numeric,
  error_message text,
  invoked_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trust_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id text,
  org_id text,
  doc jsonb,
  state text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS trust_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  policy_ref text,
  name text,
  type text,
  action text,
  severity text,
  condition_json jsonb,
  threshold numeric,
  is_active boolean,
  linked_models text[],
  framework_ref text,
  triggers_7d numeric,
  block_rate numeric,
  avg_latency_ms numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS validation_runs (
  id text PRIMARY KEY,
  tenant_id text,
  org_id text,
  doc jsonb,
  state text,
  model_id text,
  version numeric,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_instances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  tenant_id text,
  name text,
  status text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS workflow_step_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  workflow_instance_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  org_id uuid,
  role text,
  deleted_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- model_efficiency (live-only; shape from modelEfficiencyService.ts, extended
-- by 20260814000006_perf_efficiency_foundation.sql)
CREATE TABLE IF NOT EXISTS model_efficiency (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid,
  model_id uuid,
  model_name text,
  version text,
  task text,
  latency_p50 numeric,
  latency_p99 numeric,
  throughput numeric,
  accuracy numeric,
  f1_score numeric,
  cost_per_inference numeric,
  memory_mb numeric,
  carbon_per_inference numeric,
  compliance_score numeric,
  bias_score numeric,
  explainability_score numeric,
  overall_score numeric,
  benchmarked_by text,
  metadata jsonb DEFAULT '{}',
  benchmarked_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
