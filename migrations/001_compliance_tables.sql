-- Compliance audit tables for Sentinel
-- Run with: psql $DATABASE_URL -f migrations/001_compliance_tables.sql

CREATE TABLE IF NOT EXISTS compliance_audit_runs (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id       TEXT NOT NULL,
    framework_id    TEXT NOT NULL,
    run_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    signals         JSONB NOT NULL DEFAULT '{}',
    total_controls  INT NOT NULL DEFAULT 0,
    pass_count      INT NOT NULL DEFAULT 0,
    fail_count      INT NOT NULL DEFAULT 0,
    na_count        INT NOT NULL DEFAULT 0,
    score_pct       NUMERIC(5,2),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_runs_tenant
    ON compliance_audit_runs(tenant_id, framework_id, run_at DESC);

CREATE TABLE IF NOT EXISTS compliance_control_results (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id          UUID NOT NULL REFERENCES compliance_audit_runs(id) ON DELETE CASCADE,
    tenant_id       TEXT NOT NULL,
    framework_id    TEXT NOT NULL,
    control_id      TEXT NOT NULL,
    status          TEXT NOT NULL CHECK (status IN ('pass','fail','na','partial')),
    evidence        JSONB NOT NULL DEFAULT '[]',
    remediation     TEXT,
    scope_note      TEXT,
    evaluated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compliance_results_run
    ON compliance_control_results(run_id);

CREATE INDEX IF NOT EXISTS idx_compliance_results_tenant_framework
    ON compliance_control_results(tenant_id, framework_id, status);

-- TimescaleDB hypertable for rolling score analytics (run after TimescaleDB extension)
-- SELECT create_hypertable('compliance_audit_runs', 'run_at', if_not_exists => TRUE);

CREATE TABLE IF NOT EXISTS compliance_framework_configs (
    tenant_id       TEXT NOT NULL,
    framework_id    TEXT NOT NULL,
    enabled         BOOLEAN NOT NULL DEFAULT TRUE,
    config          JSONB NOT NULL DEFAULT '{}',
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, framework_id)
);
