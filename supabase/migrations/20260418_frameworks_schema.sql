-- Enterprise GRC Framework, Controls, Policy Hierarchy
CREATE TABLE IF NOT EXISTS frameworks (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, short_name TEXT, version TEXT,
  category TEXT, issuing_body TEXT, jurisdiction TEXT, effective_date DATE,
  control_count INTEGER DEFAULT 0, structure TEXT, description TEXT, url TEXT,
  status TEXT DEFAULT 'active', adopted BOOLEAN DEFAULT true, coverage_pct NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS framework_controls (
  id TEXT PRIMARY KEY, framework_id TEXT REFERENCES frameworks(id) ON DELETE CASCADE,
  control_ref TEXT NOT NULL, domain TEXT, title TEXT NOT NULL, description TEXT,
  control_type TEXT, priority TEXT DEFAULT 'medium', status TEXT DEFAULT 'not_started',
  owner TEXT, evidence_count INTEGER DEFAULT 0, last_assessed DATE,
  maturity_level INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS corporate_policies (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT, version TEXT DEFAULT '1.0',
  owner TEXT, approver TEXT, status TEXT DEFAULT 'draft', effective_date DATE,
  review_date DATE, next_review_date DATE, description TEXT, scope TEXT, content TEXT,
  attestations INTEGER DEFAULT 0, total_users INTEGER DEFAULT 0, parent_policy_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS policy_framework_mapping (
  id TEXT PRIMARY KEY, policy_id TEXT, framework_id TEXT,
  control_refs TEXT, notes TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS framework_assessments (
  id TEXT PRIMARY KEY, framework_id TEXT REFERENCES frameworks(id) ON DELETE CASCADE,
  assessment_date DATE NOT NULL, assessor TEXT, overall_score NUMERIC DEFAULT 0,
  coverage_pct NUMERIC DEFAULT 0, gap_count INTEGER DEFAULT 0, findings TEXT,
  next_review_date DATE, status TEXT DEFAULT 'in_progress', created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fc_framework ON framework_controls(framework_id);
