-- Migration 006: Security, Data Governance, and Explainability tables

-- API Keys table
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  key_prefix TEXT,
  key_hash TEXT,
  service TEXT,
  environment TEXT DEFAULT 'production',
  scopes JSONB DEFAULT '[]',
  expires_at TIMESTAMPTZ,
  last_used_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Scans
CREATE TABLE IF NOT EXISTS security_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL,
  target TEXT,
  status TEXT DEFAULT 'pending',
  severity TEXT DEFAULT 'info',
  findings_count INT DEFAULT 0,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  results JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Threats
CREATE TABLE IF NOT EXISTS security_threats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  threat_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  source TEXT,
  description TEXT,
  status TEXT DEFAULT 'active',
  mitigated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Security Vulnerabilities
CREATE TABLE IF NOT EXISTS security_vulnerabilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  cve_id TEXT,
  title TEXT NOT NULL,
  severity TEXT DEFAULT 'medium',
  cvss_score NUMERIC(3,1),
  affected_component TEXT,
  status TEXT DEFAULT 'open',
  remediation TEXT,
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Guardrails (Policy Firewall)
CREATE TABLE IF NOT EXISTS guardrails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  rule_type TEXT DEFAULT 'content_filter',
  action TEXT DEFAULT 'block',
  conditions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  triggered_count INT DEFAULT 0,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Red Team Campaigns (Model Arena)
CREATE TABLE IF NOT EXISTS red_team_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  model_id UUID REFERENCES models(id),
  name TEXT NOT NULL,
  description TEXT,
  attack_type TEXT,
  status TEXT DEFAULT 'pending',
  success_rate NUMERIC(5,2),
  total_attempts INT DEFAULT 0,
  successful_attacks INT DEFAULT 0,
  results JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Assets
CREATE TABLE IF NOT EXISTS data_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  data_type TEXT DEFAULT 'dataset',
  classification TEXT DEFAULT 'internal',
  pii_risk_level TEXT DEFAULT 'low',
  location TEXT,
  format TEXT,
  size_bytes BIGINT,
  record_count BIGINT,
  owner_id UUID REFERENCES users(id),
  retention_policy TEXT,
  tags JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- DSAR Requests (Data Subject Access Requests)
CREATE TABLE IF NOT EXISTS dsar_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  requester_name TEXT,
  requester_email TEXT,
  request_type TEXT DEFAULT 'access',
  description TEXT,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  due_date DATE,
  completed_at TIMESTAMPTZ,
  assigned_to UUID REFERENCES users(id),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Explainability Reports
CREATE TABLE IF NOT EXISTS explainability_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  model_id UUID REFERENCES models(id),
  report_type TEXT DEFAULT 'feature_importance',
  method TEXT DEFAULT 'shap',
  input_data JSONB DEFAULT '{}',
  explanation JSONB DEFAULT '{}',
  feature_importance JSONB DEFAULT '{}',
  confidence_score NUMERIC(5,2),
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_threats ENABLE ROW LEVEL SECURITY;
ALTER TABLE security_vulnerabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE guardrails ENABLE ROW LEVEL SECURITY;
ALTER TABLE red_team_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE dsar_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE explainability_reports ENABLE ROW LEVEL SECURITY;

