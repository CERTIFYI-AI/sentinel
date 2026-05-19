
-- Migration 004: AI Models, Controls, Datasets, Agents, Vendors, Bias Audits, Evidence, HITL

CREATE TABLE IF NOT EXISTS ai_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    version VARCHAR(50),
    model_type VARCHAR(100),
    owner VARCHAR(255),
    department VARCHAR(255),
    use_case TEXT,
    risk_level VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending_review',
    eu_ai_act_category VARCHAR(100),
    description TEXT,
    tags TEXT[],
    metadata JSONB DEFAULT '{}',
    compliance_score INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS controls (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    framework VARCHAR(100),
    category VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    severity VARCHAR(50) DEFAULT 'medium',
    model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    assigned_to VARCHAR(255),
    due_date DATE,
    evidence_links TEXT[],
    override_justification TEXT,
    last_tested TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS datasets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    source VARCHAR(255),
    format VARCHAR(100),
    size_gb FLOAT,
    status VARCHAR(50) DEFAULT 'active',
    pii_detected BOOLEAN DEFAULT FALSE,
    bias_score FLOAT,
    quality_score FLOAT,
    lineage TEXT,
    model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    tags TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS agents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    agent_type VARCHAR(100),
    model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    vendor_id UUID,
    status VARCHAR(50) DEFAULT 'inactive',
    autonomy_level VARCHAR(50) DEFAULT 'supervised',
    deployment_env VARCHAR(100),
    endpoint_url VARCHAR(500),
    sla_response_ms INTEGER DEFAULT 500,
    hitl_required BOOLEAN DEFAULT TRUE,
    capabilities TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(100),
    website VARCHAR(500),
    country VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    risk_score FLOAT DEFAULT 0,
    compliance_certifications TEXT[],
    contract_expiry DATE,
    services_provided TEXT[],
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bias_audits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    model_id UUID REFERENCES ai_models(id) ON DELETE CASCADE,
    dataset_id UUID REFERENCES datasets(id) ON DELETE SET NULL,
    audit_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending',
    overall_bias_score FLOAT,
    demographic_parity FLOAT,
    equalized_odds FLOAT,
    disparate_impact FLOAT,
    findings JSONB DEFAULT '[]',
    recommendations TEXT,
    auditor VARCHAR(255),
    audit_date TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    file_path VARCHAR(500),
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    evidence_type VARCHAR(100),
    related_entity_type VARCHAR(100),
    related_entity_id UUID,
    control_id UUID REFERENCES controls(id) ON DELETE SET NULL,
    model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    uploaded_by VARCHAR(255),
    tags TEXT[],
    expires_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hitl_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    review_type VARCHAR(100),
    priority VARCHAR(50) DEFAULT 'medium',
    status VARCHAR(50) DEFAULT 'pending',
    model_id UUID REFERENCES ai_models(id) ON DELETE SET NULL,
    agent_id UUID REFERENCES agents(id) ON DELETE SET NULL,
    control_id UUID REFERENCES controls(id) ON DELETE SET NULL,
    decision VARCHAR(100),
    decision_rationale TEXT,
    assigned_to VARCHAR(255),
    due_date TIMESTAMP,
    resolved_at TIMESTAMP,
    resolved_by VARCHAR(255),
    escalated BOOLEAN DEFAULT FALSE,
    sla_deadline TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_controls_model ON controls(model_id);
CREATE INDEX IF NOT EXISTS idx_datasets_model ON datasets(model_id);
CREATE INDEX IF NOT EXISTS idx_agents_model ON agents(model_id);
CREATE INDEX IF NOT EXISTS idx_bias_audits_model ON bias_audits(model_id);
CREATE INDEX IF NOT EXISTS idx_evidence_entity ON evidence(related_entity_type, related_entity_id);
CREATE INDEX IF NOT EXISTS idx_hitl_status ON hitl_reviews(status);
