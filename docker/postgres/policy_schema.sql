-- Policy Management Module Schema
-- Certifyi Sentinel

-- 1. policy_templates
CREATE TABLE IF NOT EXISTS policy_templates (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        TEXT        NOT NULL DEFAULT 'system',
    framework        TEXT        NOT NULL,
    title            TEXT        NOT NULL,
    slug             TEXT        NOT NULL,
    description      TEXT,
    body             TEXT        NOT NULL,
    version          TEXT        NOT NULL DEFAULT '1.0.0',
    status           TEXT        NOT NULL DEFAULT 'DRAFT',
    is_system        BOOLEAN     NOT NULL DEFAULT FALSE,
    parent_id        UUID        REFERENCES policy_templates (id),
    created_by       TEXT,
    approved_by      TEXT,
    rejected_by      TEXT,
    rejection_reason TEXT,
    approved_at      TIMESTAMPTZ,
    effective_date   DATE,
    next_review_date DATE,
    review_frequency TEXT        NOT NULL DEFAULT 'MONTHLY',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (tenant_id, slug, version)
);

CREATE INDEX IF NOT EXISTS idx_pt_tenant     ON policy_templates (tenant_id);
CREATE INDEX IF NOT EXISTS idx_pt_framework  ON policy_templates (tenant_id, framework);
CREATE INDEX IF NOT EXISTS idx_pt_status     ON policy_templates (tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_pt_review_due ON policy_templates (tenant_id, next_review_date)
    WHERE status = 'APPROVED';

-- 2. policy_versions
CREATE TABLE IF NOT EXISTS policy_versions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        TEXT        NOT NULL,
    policy_id        UUID        NOT NULL REFERENCES policy_templates (id) ON DELETE CASCADE,
    version          TEXT        NOT NULL,
    body             TEXT        NOT NULL,
    change_summary   TEXT,
    created_by       TEXT        NOT NULL,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (policy_id, version)
);

CREATE INDEX IF NOT EXISTS idx_pv_policy ON policy_versions (policy_id, created_at DESC);

-- 3. policy_approvals
CREATE TABLE IF NOT EXISTS policy_approvals (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        TEXT        NOT NULL,
    policy_id        UUID        NOT NULL REFERENCES policy_templates (id) ON DELETE CASCADE,
    version          TEXT        NOT NULL,
    status           TEXT        NOT NULL DEFAULT 'PENDING',
    submitted_by     TEXT        NOT NULL,
    reviewer_id      TEXT,
    decision_note    TEXT,
    submitted_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    decided_at       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_pa_policy   ON policy_approvals (policy_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_pa_reviewer ON policy_approvals (reviewer_id, status);

-- 4. policy_signatures
CREATE TABLE IF NOT EXISTS policy_signatures (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        TEXT        NOT NULL,
    policy_id        UUID        NOT NULL REFERENCES policy_templates (id) ON DELETE CASCADE,
    version          TEXT        NOT NULL,
    user_id          TEXT        NOT NULL,
    user_email       TEXT        NOT NULL,
    user_name        TEXT,
    ip_address       TEXT,
    signature_method TEXT        NOT NULL DEFAULT 'CLICK_THROUGH',
    typed_name       TEXT,
    signed_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (policy_id, version, user_id)
);

CREATE INDEX IF NOT EXISTS idx_ps_policy ON policy_signatures (policy_id, version);
CREATE INDEX IF NOT EXISTS idx_ps_user   ON policy_signatures (tenant_id, user_id);

-- 5. policy_activity_log
CREATE TABLE IF NOT EXISTS policy_activity_log (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        TEXT        NOT NULL,
    policy_id        UUID        NOT NULL REFERENCES policy_templates (id) ON DELETE CASCADE,
    actor_id         TEXT        NOT NULL,
    action           TEXT        NOT NULL,
    detail           JSONB       NOT NULL DEFAULT '{}',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pal_policy ON policy_activity_log (policy_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pal_tenant ON policy_activity_log (tenant_id, created_at DESC);

-- 6. policy_notification_settings
CREATE TABLE IF NOT EXISTS policy_notification_settings (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id        TEXT        NOT NULL UNIQUE,
    review_reminder  TEXT        NOT NULL DEFAULT 'MONTHLY',
    reminder_day_of_week  INT   DEFAULT 1,
    reminder_day_of_month INT   DEFAULT 1,
    notify_on_approval   BOOLEAN NOT NULL DEFAULT TRUE,
    notify_on_rejection  BOOLEAN NOT NULL DEFAULT TRUE,
    notify_on_new_version BOOLEAN NOT NULL DEFAULT TRUE,
    notify_assignees_on_review BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Views

CREATE OR REPLACE VIEW v_policy_summary AS
SELECT
    pt.id, pt.tenant_id, pt.framework, pt.title, pt.slug,
    pt.version, pt.status, pt.is_system, pt.parent_id,
    pt.created_by, pt.approved_by, pt.approved_at,
    pt.effective_date, pt.next_review_date, pt.review_frequency,
    pt.created_at, pt.updated_at,
    COALESCE(sig.signature_count, 0) AS signature_count,
    COALESCE(ver.version_count, 0)   AS version_count
FROM policy_templates pt
LEFT JOIN (
    SELECT policy_id, version, COUNT(*) AS signature_count
    FROM policy_signatures
    GROUP BY policy_id, version
) sig ON sig.policy_id = pt.id AND sig.version = pt.version
LEFT JOIN (
    SELECT policy_id, COUNT(*) AS version_count
    FROM policy_versions GROUP BY policy_id
) ver ON ver.policy_id = pt.id;

CREATE OR REPLACE VIEW v_policies_due_review AS
SELECT id, tenant_id, framework, title, version, next_review_date,
       CURRENT_DATE - next_review_date AS days_overdue
FROM policy_templates
WHERE status = 'APPROVED'
  AND next_review_date <= CURRENT_DATE + INTERVAL '7 days'
ORDER BY next_review_date;

CREATE OR REPLACE VIEW v_unsigned_policies AS
SELECT pt.id, pt.tenant_id, pt.framework, pt.title, pt.version
FROM policy_templates pt
WHERE pt.status = 'APPROVED'
  AND pt.tenant_id != 'system';
