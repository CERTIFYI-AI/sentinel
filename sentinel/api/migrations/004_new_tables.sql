
CREATE TABLE IF NOT EXISTS ai_models(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,name TEXT NOT NULL,version TEXT,model_type TEXT,status TEXT DEFAULT 'draft',risk_level TEXT DEFAULT 'medium',owner TEXT,description TEXT,use_case TEXT,framework TEXT,metadata JSONB DEFAULT '{}',created_at TIMESTAMPTZ DEFAULT NOW(),updated_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS datasets(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,name TEXT NOT NULL,description TEXT,source TEXT,format TEXT,size_mb FLOAT,status TEXT DEFAULT 'draft',sensitivity TEXT DEFAULT 'internal',bias_score FLOAT,owner TEXT,metadata JSONB DEFAULT '{}',created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS vendors(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,name TEXT NOT NULL,category TEXT,status TEXT DEFAULT 'pending',risk_level TEXT DEFAULT 'medium',contact_email TEXT,website TEXT,description TEXT,assessment_score FLOAT,owner TEXT,metadata JSONB DEFAULT '{}',created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS agents(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,name TEXT NOT NULL,description TEXT,agent_type TEXT,status TEXT DEFAULT 'draft',discovery_status TEXT DEFAULT 'pending',rejection_reason TEXT,risk_level TEXT DEFAULT 'medium',model_id TEXT,owner TEXT,metadata JSONB DEFAULT '{}',created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS bias_audits(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,model_id TEXT,dataset_id TEXT,status TEXT DEFAULT 'pending',bias_score FLOAT,passed BOOLEAN,results JSONB DEFAULT '{}',recommendations TEXT,completed_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS evidence(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,title TEXT NOT NULL,control_id TEXT,policy_id TEXT,description TEXT,file_url TEXT,uploaded_by TEXT,status TEXT DEFAULT 'pending',reviewed_by TEXT,reviewed_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE TABLE IF NOT EXISTS hitl_reviews(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL,entity_type TEXT NOT NULL,entity_id TEXT NOT NULL,review_type TEXT DEFAULT 'manual',assigned_to TEXT,status TEXT DEFAULT 'pending',decision TEXT,notes TEXT,context TEXT,due_at TIMESTAMPTZ,resolved_by TEXT,resolved_at TIMESTAMPTZ,created_at TIMESTAMPTZ DEFAULT NOW());
CREATE INDEX IF NOT EXISTS idx_models_tenant ON ai_models(tenant_id);
CREATE INDEX IF NOT EXISTS idx_datasets_tenant ON datasets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bias_tenant ON bias_audits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_evidence_tenant ON evidence(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hitl_tenant ON hitl_reviews(tenant_id);
