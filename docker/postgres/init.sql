-- Sentinel Database Initialization
CREATE EXTENSION IF NOT EXISTS timescaledb;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE IF NOT EXISTS tenants (
    tenant_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    plan TEXT NOT NULL DEFAULT 'free',
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_keys (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL REFERENCES tenants(tenant_id),
    key_hash TEXT NOT NULL,
    prefix TEXT NOT NULL,
    name TEXT NOT NULL DEFAULT '',
    scopes TEXT[] NOT NULL DEFAULT ARRAY['proxy'],
    revoked BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL,
    tenant_id TEXT NOT NULL,
    request_id TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    model TEXT,
    prompt_hash TEXT,
    response_hash TEXT,
    trust_score DOUBLE PRECISION,
    intervention TEXT,
    pii_detected TEXT[],
    latency_ms INTEGER,
    metadata JSONB NOT NULL DEFAULT '{}',
    prev_hash TEXT,
    entry_hash TEXT NOT NULL,
    PRIMARY KEY (id, ts)
);
SELECT create_hypertable('audit_log', 'ts', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS golden_source (
    id SERIAL PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    embedding vector(384),
    metadata JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS golden_source_embedding_idx
    ON golden_source USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS compliance_evidence (
    id BIGSERIAL,
    tenant_id TEXT NOT NULL,
    ts TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    framework TEXT NOT NULL,
    control_id TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_assessed',
    evidence JSONB NOT NULL DEFAULT '{}',
    PRIMARY KEY (id, ts)
);
SELECT create_hypertable('compliance_evidence', 'ts', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS centroids (
    tenant_id TEXT PRIMARY KEY,
    centroid vector(384),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Default tenant
INSERT INTO tenants (tenant_id, name, plan)
VALUES ('default', 'Default Tenant', 'enterprise')
ON CONFLICT (tenant_id) DO NOTHING;
