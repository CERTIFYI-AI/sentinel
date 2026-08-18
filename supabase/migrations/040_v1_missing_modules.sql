-- V1 Missing Modules Migration
-- Assets, IGA, RoPA, TIA, Tabletop, Regulator Filings, BIA

CREATE TABLE IF NOT EXISTS assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT get_org_id(),
  asset_ref text,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('ai_model','dataset','agent','api_endpoint','code_repo','saas_app','infrastructure','prompt','llm_gateway','container')),
  owner_id uuid REFERENCES user_profiles(id),
  department text,
  criticality text DEFAULT 'medium' CHECK (criticality IN ('critical','high','medium','low')),
  data_classification text DEFAULT 'internal' CHECK (data_classification IN ('public','internal','confidential','restricted','pii')),
  lifecycle_stage text DEFAULT 'active' CHECK (lifecycle_stage IN ('planned','active','decommissioning','decommissioned')),
  entity_id uuid, entity_type text,
  bia_rto_hours numeric, bia_rpo_hours numeric, bia_impact text,
  ip_address inet, hostname text, version text, vendor text,
  tags text[] DEFAULT '{}', auto_discovered boolean DEFAULT false,
  last_scanned_at timestamptz, metadata jsonb DEFAULT '{}',
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY assets_org ON assets FOR ALL USING (org_id = get_org_id());

CREATE TABLE IF NOT EXISTS access_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT get_org_id(),
  review_ref text, name text NOT NULL,
  type text DEFAULT 'user_access' CHECK (type IN ('user_access','role_certification','entitlement','sod_check','privileged')),
  status text DEFAULT 'pending' CHECK (status IN ('pending','in_progress','completed','cancelled','overdue')),
  reviewer_id uuid REFERENCES user_profiles(id),
  subject_user_id uuid REFERENCES user_profiles(id),
  scope text, risk_level text DEFAULT 'medium', due_date date,
  completed_at timestamptz,
  decision text CHECK (decision IN ('approved','revoked','modified','deferred')),
  decision_notes text, framework_ref text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE access_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY reviews_org ON access_reviews FOR ALL USING (org_id = get_org_id());

CREATE TABLE IF NOT EXISTS entitlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT get_org_id(),
  name text NOT NULL,
  type text CHECK (type IN ('role','permission','resource_access','api_scope','data_access')),
  system text, risk_level text DEFAULT 'low',
  requires_approval boolean DEFAULT false, is_privileged boolean DEFAULT false,
  description text, owners text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;
CREATE POLICY ent_org ON entitlements FOR ALL USING (org_id = get_org_id());

CREATE TABLE IF NOT EXISTS sod_violations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT get_org_id(),
  violation_ref text, user_id uuid REFERENCES user_profiles(id),
  entitlement_a_id uuid REFERENCES entitlements(id),
  entitlement_b_id uuid REFERENCES entitlements(id),
  rule_name text, severity text DEFAULT 'high',
  status text DEFAULT 'open' CHECK (status IN ('open','mitigated','accepted','false_positive')),
  detected_at timestamptz DEFAULT now(), remediation text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE sod_violations ENABLE ROW LEVEL SECURITY;
CREATE POLICY sod_org ON sod_violations FOR ALL USING (org_id = get_org_id());

CREATE TABLE IF NOT EXISTS ropa_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT get_org_id(),
  ropa_ref text, processing_activity text NOT NULL, purpose text NOT NULL,
  legal_basis text, gdpr_article text, controller_name text, processor_name text,
  data_categories text[] DEFAULT '{}', data_subjects text[] DEFAULT '{}',
  recipients text[] DEFAULT '{}', third_country_transfers boolean DEFAULT false,
  transfer_safeguards text, retention_period text, security_measures text,
  linked_model_ids uuid[] DEFAULT '{}', linked_dataset_ids uuid[] DEFAULT '{}',
  status text DEFAULT 'active' CHECK (status IN ('active','archived','under_review')),
  dpo_reviewed boolean DEFAULT false, reviewed_at date,
  owner_id uuid REFERENCES user_profiles(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE ropa_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY ropa_org ON ropa_records FOR ALL USING (org_id = get_org_id());

CREATE TABLE IF NOT EXISTS transfer_impact_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT get_org_id(),
  tia_ref text, title text NOT NULL,
  source_country text NOT NULL, destination_country text NOT NULL,
  transfer_mechanism text CHECK (transfer_mechanism IN ('SCCs','BCRs','Adequacy','DPF','Derogation','Other')),
  status text DEFAULT 'draft' CHECK (status IN ('draft','in_progress','completed','approved','rejected')),
  risk_level text DEFAULT 'medium',
  -- No inline FK on vendor_id: the vendors table is created in a later
  -- (lexically ordered) migration and its id is uuid, so a from-zero replay
  -- would fail here. Referential integrity to vendors is enforced
  -- app-side/deferred instead.
  vendor_id text,
  dataset_ids uuid[] DEFAULT '{}', model_ids uuid[] DEFAULT '{}',
  adequacy_confirmed boolean DEFAULT false, supplementary_measures text,
  dpo_approved boolean DEFAULT false,
  owner_id uuid REFERENCES user_profiles(id), due_date date,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE transfer_impact_assessments ENABLE ROW LEVEL SECURITY;
CREATE POLICY tia_org ON transfer_impact_assessments FOR ALL USING (org_id = get_org_id());

CREATE TABLE IF NOT EXISTS tabletop_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT get_org_id(),
  exercise_ref text, name text NOT NULL,
  type text CHECK (type IN ('IR','BCP','DR','Ransomware','AI-Incident','Regulatory','Custom')),
  scenario text,
  status text DEFAULT 'planned' CHECK (status IN ('planned','in_progress','completed','cancelled')),
  facilitator_id uuid REFERENCES user_profiles(id),
  participants uuid[] DEFAULT '{}', scheduled_at timestamptz,
  completed_at timestamptz, duration_minutes integer,
  objectives text[] DEFAULT '{}', findings jsonb DEFAULT '[]',
  action_items jsonb DEFAULT '[]', lessons_learned text,
  linked_playbook_id uuid, linked_bcp_id uuid,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE tabletop_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY tte_org ON tabletop_exercises FOR ALL USING (org_id = get_org_id());

CREATE TABLE IF NOT EXISTS regulator_filings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT get_org_id(),
  filing_ref text, title text NOT NULL,
  regulation text NOT NULL CHECK (regulation IN ('NIS2','DORA','GDPR-33','GDPR-34','EU-AI-Act-73','SEC-1.05','FCA','PRA','Other')),
  type text CHECK (type IN ('breach_notification','incident_report','annual_report','adhoc')),
  status text DEFAULT 'draft' CHECK (status IN ('draft','in_review','submitted','acknowledged','closed')),
  deadline timestamptz, submitted_at timestamptz,
  -- FK to incidents is added in 20260817_replay_repair.sql: incidents is
  -- created later (20260418000002_core_grc_tables.sql), so an inline REFERENCES
  -- here broke every from-zero replay (supabase db reset / CI drift job).
  -- text, not uuid: incidents.id is TEXT on live and in 20260418000002. A uuid
  -- column here cannot take the FK added by 20260817000000_replay_repair, which
  -- aborted that migration and every one of the 50 after it (audit F1).
  linked_incident_id text,
  regulator_name text, regulator_contact text, reference_number text,
  content jsonb DEFAULT '{}', attachments text[] DEFAULT '{}',
  owner_id uuid REFERENCES user_profiles(id),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE regulator_filings ENABLE ROW LEVEL SECURITY;
CREATE POLICY filings_org ON regulator_filings FOR ALL USING (org_id = get_org_id());

CREATE TABLE IF NOT EXISTS bia_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid DEFAULT get_org_id(),
  bia_ref text, process_name text NOT NULL, department text,
  owner_id uuid REFERENCES user_profiles(id),
  criticality text DEFAULT 'medium',
  rto_hours numeric, rpo_hours numeric, mtd_hours numeric,
  financial_impact_per_hour numeric, reputational_impact text,
  regulatory_impact text, dependencies text[] DEFAULT '{}',
  linked_asset_ids uuid[] DEFAULT '{}', linked_bcp_id uuid,
  last_reviewed_at date,
  created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
);
ALTER TABLE bia_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY bia_org ON bia_records FOR ALL USING (org_id = get_org_id());

CREATE TRIGGER assets_updated BEFORE UPDATE ON assets FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER access_reviews_updated BEFORE UPDATE ON access_reviews FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER ropa_updated BEFORE UPDATE ON ropa_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tia_updated BEFORE UPDATE ON transfer_impact_assessments FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER tte_updated BEFORE UPDATE ON tabletop_exercises FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER filings_updated BEFORE UPDATE ON regulator_filings FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER bia_updated BEFORE UPDATE ON bia_records FOR EACH ROW EXECUTE FUNCTION set_updated_at();
