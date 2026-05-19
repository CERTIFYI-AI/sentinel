-- ══════════════════════════════════════════════════════════════════════════════
-- Sentinel Compliance Schema
-- Append to: docker/postgres/init.sql  (or run standalone as a migration)
--
-- Tables created:
--   compliance_evidence         — hypertable, append-only, one row per eval
--   compliance_framework_scores — latest weighted score per tenant+framework
--   compliance_ncs              — non-conformance records (full lifecycle)
--   compliance_nc_history       — immutable audit trail for NC state changes
--   compliance_control_failures — consecutive failure tracking (24-hour window)
--   compliance_attestations     — manual attestation records
-- ══════════════════════════════════════════════════════════════════════════════

-- ── 1. compliance_evidence  (TimescaleDB hypertable) ─────────────────────────
CREATE TABLE IF NOT EXISTS compliance_evidence (
    id               UUID          NOT NULL DEFAULT gen_random_uuid(),
    tenant_id        TEXT          NOT NULL,
    control_id       TEXT          NOT NULL,
    framework_id     TEXT          NOT NULL,
    status           TEXT          NOT NULL,
    signal_name      TEXT,
    signal_value     DOUBLE PRECISION,
    threshold        DOUBLE PRECISION,
    delta            DOUBLE PRECISION,
    evidence_note    TEXT,
    remediation      TEXT,
    audit_entry_id   TEXT,
    evaluated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT compliance_evidence_pkey
        PRIMARY KEY (tenant_id, control_id, evaluated_at, id),
    CONSTRAINT compliance_evidence_unique
        UNIQUE (tenant_id, control_id, audit_entry_id)
);

SELECT create_hypertable(
    'compliance_evidence',
    'evaluated_at',
    chunk_time_interval => INTERVAL '7 days',
    if_not_exists => TRUE
);

CREATE INDEX IF NOT EXISTS idx_ce_tenant_fw
    ON compliance_evidence (tenant_id, framework_id, evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_tenant_control
    ON compliance_evidence (tenant_id, control_id, evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_status
    ON compliance_evidence (tenant_id, status, evaluated_at DESC);
CREATE INDEX IF NOT EXISTS idx_ce_audit_entry
    ON compliance_evidence (audit_entry_id) WHERE audit_entry_id IS NOT NULL;

SELECT add_retention_policy(
    'compliance_evidence',
    INTERVAL '2 years',
    if_not_exists => TRUE
);

-- ── 2. compliance_framework_scores ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_framework_scores (
    tenant_id        TEXT          NOT NULL,
    framework_id     TEXT          NOT NULL,
    score            DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    computed_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, framework_id)
);

CREATE INDEX IF NOT EXISTS idx_cfs_tenant
    ON compliance_framework_scores (tenant_id);

-- ── 3. compliance_ncs (Non-Conformances) ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_ncs (
    id                       UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id                TEXT          NOT NULL,
    control_id               TEXT          NOT NULL,
    framework_id             TEXT          NOT NULL,
    severity                 TEXT          NOT NULL,
    status                   TEXT          NOT NULL,
    title                    TEXT          NOT NULL,
    description              TEXT,
    recommendation_type      TEXT,
    recommendation           TEXT,
    signal_name              TEXT,
    signal_value             DOUBLE PRECISION,
    threshold                DOUBLE PRECISION,
    delta                    DOUBLE PRECISION,
    consecutive_failures     INTEGER       NOT NULL DEFAULT 1,
    first_detected_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    last_detected_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    due_date                 TIMESTAMPTZ,
    assigned_to              TEXT,
    response                 TEXT,
    verification_note        TEXT,
    closed_at                TIMESTAMPTZ,
    task_id                  UUID
);

CREATE INDEX IF NOT EXISTS idx_nc_tenant_status
    ON compliance_ncs (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_nc_tenant_fw_status
    ON compliance_ncs (tenant_id, framework_id, status);
CREATE INDEX IF NOT EXISTS idx_nc_tenant_control
    ON compliance_ncs (tenant_id, control_id);
CREATE INDEX IF NOT EXISTS idx_nc_due_date
    ON compliance_ncs (tenant_id, due_date)
    WHERE status NOT IN ('CLOSED');
CREATE INDEX IF NOT EXISTS idx_nc_assignee
    ON compliance_ncs (tenant_id, assigned_to)
    WHERE assigned_to IS NOT NULL;

-- ── 4. compliance_nc_history ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_nc_history (
    id           UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    nc_id        UUID          NOT NULL REFERENCES compliance_ncs (id) ON DELETE CASCADE,
    status       TEXT          NOT NULL,
    actor_id     TEXT          NOT NULL,
    note         TEXT,
    occurred_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_nc_history_nc_id
    ON compliance_nc_history (nc_id, occurred_at DESC);

-- ── 5. compliance_control_failures ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_control_failures (
    id            UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id     TEXT          NOT NULL,
    control_id    TEXT          NOT NULL,
    signal_value  DOUBLE PRECISION,
    threshold     DOUBLE PRECISION,
    delta         DOUBLE PRECISION,
    detected_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ccf_tenant_control
    ON compliance_control_failures (tenant_id, control_id, detected_at DESC);

-- ── 6. compliance_attestations ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_attestations (
    tenant_id        TEXT          NOT NULL,
    control_id       TEXT          NOT NULL,
    framework_id     TEXT          NOT NULL,
    status           TEXT          NOT NULL DEFAULT 'PENDING',
    attested_by      TEXT,
    attested_at      TIMESTAMPTZ,
    next_due_at      TIMESTAMPTZ,
    evidence_refs    JSONB         NOT NULL DEFAULT '[]',
    notes            TEXT,
    PRIMARY KEY (tenant_id, control_id)
);

CREATE INDEX IF NOT EXISTS idx_att_tenant
    ON compliance_attestations (tenant_id);
CREATE INDEX IF NOT EXISTS idx_att_overdue
    ON compliance_attestations (tenant_id, next_due_at)
    WHERE status IN ('PENDING', 'OVERDUE');

-- ══════════════════════════════════════════════════════════════════════════════
-- VIEWS
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE VIEW v_compliance_latest AS
SELECT DISTINCT ON (tenant_id, control_id)
    tenant_id, control_id, framework_id, status,
    signal_name, signal_value, threshold, delta,
    evidence_note, remediation, audit_entry_id, evaluated_at
FROM compliance_evidence
ORDER BY tenant_id, control_id, evaluated_at DESC;

CREATE OR REPLACE VIEW v_nc_open_summary AS
SELECT
    tenant_id, framework_id,
    COUNT(*)                                              AS total_open,
    COUNT(*) FILTER (WHERE severity = 'CRITICAL')         AS critical_open,
    COUNT(*) FILTER (WHERE severity = 'HIGH')             AS high_open,
    COUNT(*) FILTER (WHERE severity = 'MEDIUM')           AS medium_open,
    COUNT(*) FILTER (WHERE status = 'ASSIGNED')           AS assigned,
    COUNT(*) FILTER (WHERE status = 'PENDING_VERIFICATION') AS pending_verification,
    MIN(due_date)                                         AS earliest_due
FROM compliance_ncs
WHERE status NOT IN ('CLOSED')
GROUP BY tenant_id, framework_id;

CREATE OR REPLACE VIEW v_attestation_overdue AS
SELECT
    tenant_id,
    COUNT(*) AS overdue_count
FROM compliance_attestations
WHERE next_due_at < NOW()
  AND status != 'OVERDUE'
   OR status = 'OVERDUE'
GROUP BY tenant_id;

-- ══════════════════════════════════════════════════════════════════════════════
-- GRANTS
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_roles WHERE rolname = 'sentinel_api') THEN
        GRANT SELECT, INSERT ON compliance_evidence          TO sentinel_api;
        GRANT SELECT, INSERT, UPDATE ON compliance_framework_scores TO sentinel_api;
        GRANT SELECT, INSERT, UPDATE ON compliance_ncs       TO sentinel_api;
        GRANT SELECT, INSERT ON compliance_nc_history        TO sentinel_api;
        GRANT SELECT, INSERT ON compliance_control_failures  TO sentinel_api;
        GRANT SELECT, INSERT, UPDATE ON compliance_attestations TO sentinel_api;
        GRANT SELECT ON v_compliance_latest   TO sentinel_api;
        GRANT SELECT ON v_nc_open_summary     TO sentinel_api;
        GRANT SELECT ON v_attestation_overdue TO sentinel_api;
    END IF;
END $$;
