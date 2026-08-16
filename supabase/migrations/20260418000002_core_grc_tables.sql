-- ============================================================
-- Sentinel AI GRC Platform — Core Tables Migration
-- Creates all primary GRC tables with tenant_id pattern
-- (matching the frontend service layer convention)
-- ============================================================

-- ── Risks ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  risk_id TEXT,
  title TEXT NOT NULL,
  name TEXT,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Operational',
  subcategory TEXT,
  source TEXT,
  risk_type TEXT,
  likelihood INTEGER CHECK (likelihood BETWEEN 1 AND 5) DEFAULT 1,
  impact INTEGER CHECK (impact BETWEEN 1 AND 5) DEFAULT 1,
  severity INTEGER CHECK (severity BETWEEN 1 AND 5) DEFAULT 1,
  score INTEGER GENERATED ALWAYS AS (likelihood * GREATEST(impact, severity)) STORED,
  risk_level TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  treatment TEXT,
  owner TEXT,
  owner_name TEXT,
  department TEXT,
  identified_date DATE DEFAULT CURRENT_DATE,
  target_resolution_date DATE,
  actual_resolution_date DATE,
  linked_model_ids TEXT[],
  linked_control_ids TEXT[],
  applicable_frameworks TEXT[],
  applicable_use_cases TEXT[],
  mitigation_plan TEXT,
  mitigation_status TEXT DEFAULT 'not_started',
  implementation_strategy TEXT,
  residual_likelihood INTEGER CHECK (residual_likelihood BETWEEN 1 AND 5),
  residual_impact INTEGER CHECK (residual_impact BETWEEN 1 AND 5),
  residual_severity INTEGER,
  residual_score INTEGER,
  is_escalated BOOLEAN DEFAULT false,
  escalation_reason TEXT,
  review_frequency TEXT,
  last_reviewed_date DATE,
  next_review_date DATE,
  trending TEXT DEFAULT 'stable',
  potential_impact TEXT,
  approver TEXT,
  approval_status TEXT,
  review_notes TEXT,
  action_owner TEXT,
  ai_lifecycle_phase TEXT,
  source_incident_id TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_risks_tenant ON risks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(status);
CREATE INDEX IF NOT EXISTS idx_risks_level ON risks(risk_level);

-- ── Model Inventory ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  model_type TEXT DEFAULT 'LLM',
  provider TEXT,
  description TEXT,
  deployment_env TEXT DEFAULT 'production',
  risk_level TEXT DEFAULT 'medium',
  risk_score NUMERIC(5,2),
  status TEXT DEFAULT 'active',
  lifecycle_stage TEXT DEFAULT 'production',
  compliance_status TEXT DEFAULT 'pending',
  purpose TEXT,
  use_case TEXT,
  data_inputs TEXT[],
  data_outputs TEXT[],
  training_data_description TEXT,
  bias_assessment_status TEXT DEFAULT 'not_assessed',
  explainability_level TEXT DEFAULT 'partial',
  human_oversight_required BOOLEAN DEFAULT true,
  hitl_enabled BOOLEAN DEFAULT false,
  hitl_pending BOOLEAN DEFAULT false,
  frameworks TEXT[],
  eu_ai_act_category TEXT,
  nist_ai_rmf_profile JSONB,
  owner TEXT,
  owner_name TEXT,
  owner_email TEXT,
  team TEXT,
  department TEXT,
  business_unit TEXT,
  vendor_id TEXT,
  vendor_name TEXT,
  vendor_contact TEXT,
  license_type TEXT,
  api_endpoint TEXT,
  endpoint_url TEXT,
  integration_type TEXT,
  last_audit_date DATE,
  next_review_date DATE,
  retirement_date DATE,
  deployment_date DATE,
  incident_count INTEGER DEFAULT 0,
  alert_count INTEGER DEFAULT 0,
  accuracy NUMERIC(5,2),
  latency_ms NUMERIC(8,2),
  linked_policies TEXT[],
  linked_datasets TEXT[],
  linked_controls TEXT[],
  notes TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_models_tenant ON model_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_models_status ON model_inventory(status);

-- ── Incidents ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  incident_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium',
  category TEXT,
  status TEXT DEFAULT 'open',
  source TEXT,
  incident_type TEXT DEFAULT 'model_failure',
  affected_models TEXT[],
  affected_systems TEXT[],
  detection_method TEXT,
  detected_at TIMESTAMPTZ,
  contained_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  root_cause TEXT,
  root_cause_category TEXT,
  impact_description TEXT,
  affected_users_count INTEGER,
  financial_impact NUMERIC(15,2),
  regulatory_reportable BOOLEAN DEFAULT false,
  reported_to TEXT[],
  reporter TEXT,
  reporter_id TEXT,
  assignee TEXT,
  assignee_id TEXT,
  response_team TEXT[],
  remediation_actions TEXT,
  planned_corrective_actions TEXT,
  immediate_mitigations TEXT,
  lessons_learned TEXT,
  prevention_measures TEXT,
  recurrence_risk TEXT,
  linked_risk_ids TEXT[],
  linked_control_ids TEXT[],
  linked_risk_id TEXT,
  ai_use_case TEXT,
  framework_id TEXT,
  occurred_date DATE,
  detected_date DATE,
  model_system_version TEXT,
  categories_of_harm TEXT[],
  affected_persons TEXT,
  relationship_causality TEXT,
  approval_status TEXT,
  approved_by TEXT,
  has_interim_report BOOLEAN DEFAULT false,
  interim_report_content TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_incidents_tenant ON incidents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);

-- ── Controls ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS controls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  control_id TEXT,
  name TEXT NOT NULL,
  title TEXT,
  framework TEXT NOT NULL DEFAULT 'ISO_42001',
  domain TEXT,
  category TEXT,
  clause TEXT,
  description TEXT,
  requirement TEXT,
  implementation_guidance TEXT,
  status TEXT DEFAULT 'not_started',
  implementation_status TEXT DEFAULT 'not_started',
  priority TEXT DEFAULT 'medium',
  risk_level TEXT DEFAULT 'medium',
  risk_rating TEXT,
  score NUMERIC(5,2) DEFAULT 0,
  effectiveness_score NUMERIC(5,2) DEFAULT 0,
  owner TEXT,
  owner_name TEXT,
  assigned_team TEXT,
  frequency TEXT DEFAULT 'monthly',
  test_frequency TEXT,
  due_date DATE,
  completion_date DATE,
  evidence_required BOOLEAN DEFAULT true,
  evidence_count INTEGER DEFAULT 0,
  last_tested_date DATE,
  next_test_date DATE,
  last_tested TEXT,
  test_result TEXT DEFAULT 'not_tested',
  remediation_plan TEXT,
  remediation_deadline DATE,
  linked_model_ids TEXT[],
  linked_risk_ids TEXT[],
  linked_policy_ids TEXT[],
  linked_models JSONB DEFAULT '[]',
  test_results JSONB DEFAULT '[]',
  evidence_items JSONB DEFAULT '[]',
  notes TEXT,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_controls_tenant ON controls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_controls_framework ON controls(framework);
CREATE INDEX IF NOT EXISTS idx_controls_status ON controls(status);

-- ── Evidence ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  title TEXT NOT NULL,
  description TEXT,
  source TEXT,
  framework TEXT,
  control TEXT,
  control_id TEXT,
  evidence_type TEXT DEFAULT 'document',
  type TEXT,
  file_url TEXT,
  file_name TEXT,
  file_size TEXT,
  mime_type TEXT,
  storage_path TEXT,
  collection_date DATE DEFAULT CURRENT_DATE,
  expiry_date DATE,
  last_sync TEXT,
  validity_status TEXT DEFAULT 'valid',
  status TEXT DEFAULT 'valid',
  collected_by TEXT,
  owner TEXT,
  reviewed_by TEXT,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  version TEXT DEFAULT '1.0',
  is_automated BOOLEAN DEFAULT false,
  is_auto_collected BOOLEAN DEFAULT false,
  automation_source TEXT,
  freshness_status TEXT DEFAULT 'fresh',
  linked_controls TEXT[],
  linked_models TEXT[],
  activity_log JSONB DEFAULT '[]',
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_evidence_tenant ON evidence(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evidence_control ON evidence(control_id);

-- ── HITL Reviews ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hitl_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  model_id TEXT,
  review_type TEXT DEFAULT 'output_review',
  title TEXT NOT NULL,
  description TEXT,
  ai_output JSONB,
  ai_confidence NUMERIC(5,4),
  review_status TEXT DEFAULT 'pending',
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  risk_level TEXT DEFAULT 'medium',
  trigger_reason TEXT,
  assigned_to TEXT,
  reviewer_name TEXT,
  reviewed_at TIMESTAMPTZ,
  reviewer_decision TEXT,
  decision TEXT,
  reviewer_comments TEXT,
  remarks TEXT,
  modified_output JSONB,
  override_reason TEXT,
  sla_hours INTEGER DEFAULT 48,
  sla_deadline TIMESTAMPTZ,
  sla_breached BOOLEAN DEFAULT false,
  is_overdue BOOLEAN DEFAULT false,
  decided_at TIMESTAMPTZ,
  decided_by TEXT,
  linked_risk_id TEXT,
  linked_control_id TEXT,
  escalation_path TEXT[],
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hitl_tenant ON hitl_reviews(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hitl_status ON hitl_reviews(status);

-- ── Policies ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  policy_id TEXT,
  name TEXT,
  title TEXT NOT NULL,
  description TEXT,
  type TEXT,
  category TEXT,
  status TEXT DEFAULT 'draft',
  version TEXT DEFAULT '1.0',
  content TEXT,
  effective_date DATE,
  expiry_date DATE,
  review_date DATE,
  last_review TEXT,
  next_review TEXT,
  next_review_date DATE,
  owner TEXT,
  owner_name TEXT,
  approver TEXT,
  approver_id TEXT,
  approved_at TIMESTAMPTZ,
  scope TEXT,
  audience TEXT[],
  framework TEXT,
  linked_frameworks TEXT[],
  linked_control_ids TEXT[],
  acknowledgment_required BOOLEAN DEFAULT false,
  acknowledgment_count INTEGER DEFAULT 0,
  attestations INTEGER DEFAULT 0,
  total_users INTEGER DEFAULT 0,
  remarks TEXT,
  approval_date TIMESTAMPTZ,
  compliance_score NUMERIC(5,2) DEFAULT 0,
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_policies_tenant ON policies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);

-- ── Audit Logs (GRC) ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  action TEXT NOT NULL,
  actor TEXT DEFAULT 'system',
  actor_id TEXT,
  resource_type TEXT,
  resource_id TEXT,
  resource_name TEXT,
  old_value JSONB,
  new_value JSONB,
  changes JSONB,
  details JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  request_id TEXT,
  duration_ms INTEGER,
  status TEXT DEFAULT 'success',
  severity TEXT DEFAULT 'info',
  tags TEXT[],
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);

-- ── Notifications ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  user_id TEXT DEFAULT 'system',
  title TEXT,
  message TEXT,
  notification_type TEXT DEFAULT 'info',
  entity_type TEXT,
  entity_id TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notif_tenant ON notifications(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id);

-- ── Agents ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  agent_type TEXT,
  source TEXT DEFAULT 'manual',
  status TEXT DEFAULT 'Discovered',
  discovery_status TEXT DEFAULT 'pending',
  governance_status TEXT DEFAULT 'pending',
  risk_level TEXT DEFAULT 'medium',
  linked_model_id TEXT,
  owner TEXT,
  linked_policy_id TEXT,
  governing_policy_id TEXT,
  vendor_id TEXT,
  vendor TEXT,
  discovery_metadata JSONB DEFAULT '{}',
  rejection_reason TEXT,
  compliance_score NUMERIC(5,2) DEFAULT 0,
  confirmed_at TIMESTAMPTZ,
  discovered_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);

-- ── Bias Audits ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bias_audits (
  -- text PK: the live table keys audits by text ids ('ba-cs3-002' etc.);
  -- uuid here made every canonical-era seed fail on from-zero replay.
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  model_id TEXT,
  dataset_id TEXT,
  framework TEXT DEFAULT 'EU AI Act',
  status TEXT DEFAULT 'Draft',
  overall_score NUMERIC(5,2),
  breakdown JSONB DEFAULT '{}',
  metrics JSONB DEFAULT '{}',
  recommendations JSONB DEFAULT '[]',
  threshold NUMERIC(5,2) DEFAULT 0.85,
  passed BOOLEAN,
  triggered_by TEXT DEFAULT 'manual',
  remediation_task_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_bias_tenant ON bias_audits(tenant_id);

-- ── Vendors ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  category TEXT DEFAULT 'Foundation Model',
  risk_tier INTEGER DEFAULT 2,
  status TEXT DEFAULT 'Active',
  contract_expiry TIMESTAMPTZ,
  has_data_sharing_agreement BOOLEAN DEFAULT false,
  soc2_certified BOOLEAN DEFAULT false,
  iso_certified BOOLEAN DEFAULT false,
  contact_info JSONB DEFAULT '{}',
  linked_models JSONB DEFAULT '[]',
  linked_agents JSONB DEFAULT '[]',
  compliance_score NUMERIC(5,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);

-- ── Datasets ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS datasets (
  -- text PK: the live table keys datasets by text ids; the canonical
  -- 20260814 datasets consolidation declares text FKs against it.
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  version TEXT DEFAULT '1.0',
  category TEXT,
  sensitivity TEXT DEFAULT 'Internal',
  data_owner TEXT,
  source TEXT,
  volume TEXT,
  contains_pii BOOLEAN DEFAULT false,
  contains_demographic BOOLEAN DEFAULT false,
  linked_models JSONB DEFAULT '[]',
  lineage_notes TEXT,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_datasets_tenant ON datasets(tenant_id);

-- ── Compliance Events ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  event_type TEXT,
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_tenant ON compliance_events(tenant_id);

-- ── Control Tests ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS control_tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  control_id TEXT NOT NULL,
  result TEXT NOT NULL,
  tester TEXT,
  notes TEXT,
  tested_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ctests_control ON control_tests(control_id);

-- ── Trust Traces ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS trust_traces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  trust_id TEXT UNIQUE,
  model_id TEXT,
  user_hash TEXT,
  original_prompt TEXT,
  transformed_prompt TEXT,
  raw_response TEXT,
  filtered_response TEXT,
  trust_score NUMERIC(5,2) DEFAULT 100.0,
  pii_detected BOOLEAN DEFAULT false,
  injection_detected BOOLEAN DEFAULT false,
  intent_violation BOOLEAN DEFAULT false,
  hallucination_score NUMERIC(5,2) DEFAULT 0.0,
  toxicity_detected BOOLEAN DEFAULT false,
  schema_valid BOOLEAN DEFAULT true,
  fallback_triggered BOOLEAN DEFAULT false,
  input_tokens INTEGER DEFAULT 0,
  output_tokens INTEGER DEFAULT 0,
  latency_ms NUMERIC(8,2) DEFAULT 0.0,
  cost_usd NUMERIC(10,6) DEFAULT 0.0,
  guardrail_rules JSONB DEFAULT '[]',
  region TEXT DEFAULT 'us-east-1',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_traces_tenant ON trust_traces(tenant_id);
CREATE INDEX IF NOT EXISTS idx_traces_model ON trust_traces(model_id);

-- ── Policy Versions ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS policy_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_id TEXT NOT NULL,
  version TEXT,
  content TEXT,
  status TEXT,
  changed_by TEXT,
  changelog TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pv_policy ON policy_versions(policy_id);

-- ── Model Versions ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS model_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id TEXT NOT NULL,
  version TEXT,
  change_summary TEXT,
  changed_by TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mv_model ON model_versions(model_id);

-- ── HITL Items (legacy compat) ────────────────────────────
CREATE TABLE IF NOT EXISTS hitl_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  entity_type TEXT,
  entity_id TEXT,
  entity_name TEXT,
  risk_level TEXT DEFAULT 'medium',
  trigger_reason TEXT,
  status TEXT DEFAULT 'pending',
  assigned_to TEXT,
  decision TEXT,
  remarks TEXT,
  sla_hours INTEGER DEFAULT 48,
  is_overdue BOOLEAN DEFAULT false,
  decided_at TIMESTAMPTZ,
  decided_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_hitl_items_tenant ON hitl_items(tenant_id);

-- ── Risk Entries (legacy compat) ──────────────────────────
CREATE TABLE IF NOT EXISTS risk_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT,
  title TEXT,
  description TEXT,
  category TEXT,
  likelihood INTEGER DEFAULT 1,
  severity INTEGER DEFAULT 1,
  impact INTEGER DEFAULT 1,
  risk_level TEXT DEFAULT 'medium',
  status TEXT DEFAULT 'open',
  mitigation_status TEXT DEFAULT 'not_started',
  mitigation_plan TEXT,
  owner TEXT,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_re_tenant ON risk_entries(tenant_id);

-- ── Evidence Items (legacy compat) ────────────────────────
CREATE TABLE IF NOT EXISTS evidence_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  title TEXT NOT NULL,
  description TEXT,
  evidence_type TEXT DEFAULT 'document',
  file_url TEXT,
  linked_control_ids TEXT[],
  linked_model_ids TEXT[],
  collection_date DATE DEFAULT CURRENT_DATE,
  freshness_status TEXT DEFAULT 'fresh',
  tags TEXT[],
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ei_tenant ON evidence_items(tenant_id);

-- ── Guardrail Rules ───────────────────────────────────────
CREATE TABLE IF NOT EXISTS guardrail_rules (
  -- text PK: live keys guardrail rules by text refs ('grl-pii-high')
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  rule_type TEXT DEFAULT 'injection',
  model_id TEXT,
  pattern TEXT,
  action TEXT DEFAULT 'block',
  severity TEXT DEFAULT 'High',
  enabled BOOLEAN DEFAULT true,
  trigger_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gr_tenant ON guardrail_rules(tenant_id);

-- ── Use Cases ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS use_cases (
  -- text PK: the live table keys use cases by text refs ('UC-CREDIT-001');
  -- uuid here broke the canonical AIIA seeds on from-zero replay.
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  -- live rows are keyed on title; name stays for the legacy readers but can
  -- no longer be NOT NULL on a from-zero replay
  name TEXT,
  description TEXT,
  department TEXT,
  status TEXT DEFAULT 'active',
  risk_level TEXT DEFAULT 'medium',
  linked_model_id TEXT,
  framework TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_uc_tenant ON use_cases(tenant_id);

-- ── Tasks ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tasks (
  -- text PK: live keys tasks by text refs ('task-001')
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id TEXT NOT NULL DEFAULT 'default',
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  assigned_to TEXT,
  due_date DATE,
  entity_type TEXT,
  entity_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tasks_tenant ON tasks(tenant_id);

-- ── Approval Workflows ────────────────────────────────────
CREATE TABLE IF NOT EXISTS approval_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  entity_name TEXT,
  workflow_type TEXT DEFAULT 'approval',
  status TEXT DEFAULT 'pending',
  requested_by TEXT,
  assigned_to TEXT,
  decision TEXT,
  decision_date TIMESTAMPTZ,
  comments TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_aw_tenant ON approval_workflows(tenant_id);

-- ── Regulation Entries ────────────────────────────────────
CREATE TABLE IF NOT EXISTS regulation_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  jurisdiction TEXT DEFAULT 'EU',
  status TEXT DEFAULT 'Enacted',
  effective_date TEXT,
  relevance_score NUMERIC(5,2) DEFAULT 0.0,
  linked_frameworks JSONB DEFAULT '[]',
  linked_policies JSONB DEFAULT '[]',
  requirements_summary TEXT,
  models_in_scope INTEGER DEFAULT 0,
  controls_mapped INTEGER DEFAULT 0,
  gap_percent NUMERIC(5,2) DEFAULT 0.0,
  alert_on_change BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reg_tenant ON regulation_entries(tenant_id);

-- ── RBAC Roles ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rbac_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  name TEXT NOT NULL,
  description TEXT,
  is_system BOOLEAN DEFAULT false,
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rbac_roles_tenant ON rbac_roles(tenant_id);

-- ── RBAC Users ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS rbac_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  email TEXT NOT NULL,
  name TEXT,
  role_id TEXT,
  role_name TEXT DEFAULT 'Auditor',
  enabled BOOLEAN DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rbac_users_tenant ON rbac_users(tenant_id);

-- ── Shadow AI Findings ────────────────────────────────────
CREATE TABLE IF NOT EXISTS shadow_ai_findings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  source_type TEXT,
  endpoint TEXT,
  library TEXT,
  service TEXT,
  first_seen TIMESTAMPTZ DEFAULT now(),
  last_seen TIMESTAMPTZ DEFAULT now(),
  risk_level TEXT DEFAULT 'High',
  status TEXT DEFAULT 'Unsanctioned',
  recommended_action TEXT DEFAULT 'Sanction',
  escalated_to_hitl BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shadow_tenant ON shadow_ai_findings(tenant_id);

-- ── Observability Metrics ─────────────────────────────────
CREATE TABLE IF NOT EXISTS observability_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  model_id TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  p50_latency NUMERIC(8,2) DEFAULT 0,
  p95_latency NUMERIC(8,2) DEFAULT 0,
  p99_latency NUMERIC(8,2) DEFAULT 0,
  error_rate NUMERIC(5,4) DEFAULT 0,
  throughput NUMERIC(8,2) DEFAULT 0,
  psi_score NUMERIC(5,2) DEFAULT 0,
  trust_score NUMERIC(5,2) DEFAULT 100,
  token_count INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_obs_tenant ON observability_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_obs_model ON observability_metrics(model_id);

-- ── Model Trust Configs ───────────────────────────────────
CREATE TABLE IF NOT EXISTS model_trust_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  model_id TEXT UNIQUE NOT NULL,
  allowed_intents JSONB DEFAULT '[]',
  blocked_intents JSONB DEFAULT '[]',
  output_schema TEXT,
  fallback_chain JSONB DEFAULT '[]',
  trust_score_threshold NUMERIC(5,2) DEFAULT 70.0,
  fallback_threshold NUMERIC(5,2) DEFAULT 50.0,
  pii_sensitivity TEXT DEFAULT 'redact',
  hallucination_mode TEXT DEFAULT 'balanced',
  budget_monthly_usd NUMERIC(10,2) DEFAULT 0,
  latency_sla_ms NUMERIC(8,2) DEFAULT 5000,
  tool_policy JSONB DEFAULT '{}',
  retention_days INTEGER DEFAULT 90,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_mtc_tenant ON model_trust_configs(tenant_id);

-- ── Vendor Questionnaires ─────────────────────────────────
CREATE TABLE IF NOT EXISTS vendor_questionnaires (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  vendor_id TEXT NOT NULL,
  template TEXT DEFAULT 'CAIQ',
  questions JSONB DEFAULT '[]',
  answers JSONB DEFAULT '{}',
  status TEXT DEFAULT 'Draft',
  score NUMERIC(5,2),
  sent_date TIMESTAMPTZ,
  response_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_vq_tenant ON vendor_questionnaires(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vq_vendor ON vendor_questionnaires(vendor_id);

-- ── Enable RLS on all tables ──────────────────────────────
-- Note: Using tenant_id pattern (not auth.uid) for compatibility with
-- the existing API/service layer that uses JWT-based tenancy
ALTER TABLE risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE controls ENABLE ROW LEVEL SECURITY;
ALTER TABLE evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE hitl_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE bias_audits ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE trust_traces ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardrail_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE shadow_ai_findings ENABLE ROW LEVEL SECURITY;

-- Allow anonymous/service role access (the anon key is used by the frontend)
-- RLS policies that allow access (anon key has full access in dev mode)
DROP POLICY IF EXISTS "allow_all_risks" ON risks;
CREATE POLICY "allow_all_risks" ON risks FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_models" ON model_inventory;
CREATE POLICY "allow_all_models" ON model_inventory FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_incidents" ON incidents;
CREATE POLICY "allow_all_incidents" ON incidents FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_controls" ON controls;
CREATE POLICY "allow_all_controls" ON controls FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_evidence" ON evidence;
CREATE POLICY "allow_all_evidence" ON evidence FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_hitl" ON hitl_reviews;
CREATE POLICY "allow_all_hitl" ON hitl_reviews FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_policies" ON policies;
CREATE POLICY "allow_all_policies" ON policies FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_audit_logs" ON audit_logs;
CREATE POLICY "allow_all_audit_logs" ON audit_logs FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_notifications" ON notifications;
CREATE POLICY "allow_all_notifications" ON notifications FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_agents" ON agents;
CREATE POLICY "allow_all_agents" ON agents FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_bias_audits" ON bias_audits;
CREATE POLICY "allow_all_bias_audits" ON bias_audits FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_vendors" ON vendors;
CREATE POLICY "allow_all_vendors" ON vendors FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_datasets" ON datasets;
CREATE POLICY "allow_all_datasets" ON datasets FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_trust_traces" ON trust_traces;
CREATE POLICY "allow_all_trust_traces" ON trust_traces FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_guardrail_rules" ON guardrail_rules;
CREATE POLICY "allow_all_guardrail_rules" ON guardrail_rules FOR ALL USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "allow_all_shadow_ai" ON shadow_ai_findings;
CREATE POLICY "allow_all_shadow_ai" ON shadow_ai_findings FOR ALL USING (true) WITH CHECK (true);
