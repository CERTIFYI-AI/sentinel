-- Migration 003: Full Compliance Platform Tables
-- Model Inventory
CREATE TABLE IF NOT EXISTS model_inventory (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    version TEXT NOT NULL DEFAULT '1.0.0',
    model_type TEXT,
    risk_level TEXT DEFAULT 'medium' CHECK(risk_level IN ('low','medium','high','critical')),
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','staging','production','deprecated')),
    owner TEXT,
    vendor_id TEXT,
    linked_dataset_ids TEXT[] DEFAULT '{}',
    linked_policy_ids TEXT[] DEFAULT '{}',
    linked_control_ids TEXT[] DEFAULT '{}',
    deployment_date TIMESTAMPTZ,
    last_audit_date TIMESTAMPTZ,
    bias_score NUMERIC(5,3),
    drift_score NUMERIC(5,3),
    compliance_score NUMERIC(5,1) DEFAULT 0,
    compliance_status TEXT DEFAULT 'pending',
    hitl_status TEXT DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_model_inv_tenant ON model_inventory(tenant_id);
CREATE INDEX IF NOT EXISTS idx_model_inv_status ON model_inventory(status);

-- Model version history
CREATE TABLE IF NOT EXISTS model_versions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    model_id TEXT NOT NULL REFERENCES model_inventory(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    version TEXT NOT NULL,
    changed_by TEXT,
    change_summary TEXT,
    snapshot JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Dataset Registry
CREATE TABLE IF NOT EXISTS dataset_registry (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    version TEXT DEFAULT '1.0',
    category TEXT,
    sensitivity TEXT DEFAULT 'internal' CHECK(sensitivity IN ('public','internal','confidential','restricted')),
    data_owner TEXT,
    source TEXT,
    volume_records BIGINT,
    last_updated TIMESTAMPTZ,
    contains_pii BOOLEAN DEFAULT FALSE,
    contains_demographic BOOLEAN DEFAULT FALSE,
    linked_model_ids TEXT[] DEFAULT '{}',
    lineage_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_dataset_tenant ON dataset_registry(tenant_id);

-- Controls
CREATE TABLE IF NOT EXISTS controls (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    control_id TEXT,
    name TEXT NOT NULL,
    category TEXT,
    description TEXT,
    owner TEXT,
    framework TEXT,
    linked_policy_ids TEXT[] DEFAULT '{}',
    frequency TEXT DEFAULT 'monthly',
    risk_level TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'not_implemented' CHECK(status IN ('implemented','partially_implemented','not_implemented','failed')),
    effectiveness_score NUMERIC(5,1) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_controls_tenant ON controls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_controls_status ON controls(status);

-- Control test results
CREATE TABLE IF NOT EXISTS control_tests (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    control_id TEXT NOT NULL REFERENCES controls(id) ON DELETE CASCADE,
    tenant_id TEXT NOT NULL,
    result TEXT CHECK(result IN ('pass','fail')),
    tester TEXT,
    notes TEXT,
    tested_at TIMESTAMPTZ DEFAULT NOW()
);

-- Vendors
CREATE TABLE IF NOT EXISTS vendors (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    category TEXT CHECK(category IN ('foundation_model','api_service','data_provider','tool_provider')),
    risk_tier INTEGER DEFAULT 2 CHECK(risk_tier IN (1,2,3)),
    status TEXT DEFAULT 'active' CHECK(status IN ('active','under_review','suspended')),
    contract_expiry DATE,
    data_sharing_agreement BOOLEAN DEFAULT FALSE,
    soc2_certified BOOLEAN DEFAULT FALSE,
    iso_certified BOOLEAN DEFAULT FALSE,
    contact_name TEXT,
    contact_email TEXT,
    linked_model_ids TEXT[] DEFAULT '{}',
    linked_agent_ids TEXT[] DEFAULT '{}',
    risk_score NUMERIC(5,1) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);

-- Agents (discovered)
CREATE TABLE IF NOT EXISTS agents (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    name TEXT NOT NULL,
    source TEXT CHECK(source IN ('k8s','api_gateway','cicd','logs','manual')),
    agent_type TEXT,
    risk_level TEXT DEFAULT 'medium',
    discovery_status TEXT DEFAULT 'unconfirmed' CHECK(discovery_status IN ('unconfirmed','confirmed','rejected')),
    governance_status TEXT DEFAULT 'pending',
    linked_model_id TEXT,
    owner TEXT,
    linked_policy_id TEXT,
    vendor_id TEXT,
    rejection_reason TEXT,
    discovery_metadata JSONB DEFAULT '{}',
    discovered_at TIMESTAMPTZ DEFAULT NOW(),
    confirmed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_agents_tenant ON agents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_agents_discovery_status ON agents(discovery_status);

-- Bias Audits
CREATE TABLE IF NOT EXISTS bias_audits (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    model_id TEXT,
    model_name TEXT,
    dataset_id TEXT,
    dataset_name TEXT,
    framework TEXT DEFAULT 'eu_ai_act',
    bias_score NUMERIC(5,3),
    threshold NUMERIC(5,3) DEFAULT 0.1,
    passed BOOLEAN,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft','running','complete','failed')),
    trigger_reason TEXT,
    results JSONB DEFAULT '{}',
    recommendations TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bias_audits_tenant ON bias_audits(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bias_audits_model ON bias_audits(model_id);

-- Evidence items
CREATE TABLE IF NOT EXISTS evidence_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    evidence_type TEXT CHECK(evidence_type IN ('screenshot','log','report','certificate','api_pull')),
    source TEXT,
    collection_date TIMESTAMPTZ DEFAULT NOW(),
    linked_control_ids TEXT[] DEFAULT '{}',
    linked_model_ids TEXT[] DEFAULT '{}',
    is_auto BOOLEAN DEFAULT FALSE,
    file_url TEXT,
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_evidence_tenant ON evidence_items(tenant_id);

-- HITL items
CREATE TABLE IF NOT EXISTS hitl_items (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    entity_name TEXT,
    trigger_reason TEXT,
    risk_level TEXT DEFAULT 'medium',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending','approved','rejected','info_requested','escalated')),
    sla_hours INTEGER DEFAULT 120,
    due_at TIMESTAMPTZ GENERATED ALWAYS AS (created_at + (sla_hours || ' hours')::interval) STORED,
    assigned_to TEXT,
    decision_by TEXT,
    decision_at TIMESTAMPTZ,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(entity_id, trigger_reason, status)
);
CREATE INDEX IF NOT EXISTS idx_hitl_tenant ON hitl_items(tenant_id);
CREATE INDEX IF NOT EXISTS idx_hitl_status ON hitl_items(status);

-- Global compliance scores
CREATE TABLE IF NOT EXISTS compliance_scores (
    tenant_id TEXT PRIMARY KEY,
    score NUMERIC(5,1) DEFAULT 0,
    calculated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit log (immutable)
CREATE TABLE IF NOT EXISTS compliance_audit_log (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    actor TEXT,
    action TEXT NOT NULL,
    entity_type TEXT,
    entity_id TEXT,
    old_value JSONB,
    new_value JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_audit_log_tenant ON compliance_audit_log(tenant_id);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    tenant_id TEXT NOT NULL,
    user_id TEXT,
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    entity_type TEXT,
    entity_id TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_tenant ON notifications(tenant_id, user_id, is_read);
