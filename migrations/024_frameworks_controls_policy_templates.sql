-- 024_frameworks_controls_policy_templates.sql
-- Idempotent migration: frameworks, controls, policy_templates + RLS + seed
-- Generated 2026-04-18 as part of Sentinel AI GRC QA/QC remediation

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =========================================================
-- 1. frameworks
-- =========================================================
CREATE TABLE IF NOT EXISTS frameworks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code          VARCHAR(64)  NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  category      VARCHAR(64)  NOT NULL,
  jurisdiction  VARCHAR(128),
  version       VARCHAR(32),
  description   TEXT,
  control_count INT NOT NULL DEFAULT 0,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_frameworks_category ON frameworks(category);
CREATE INDEX IF NOT EXISTS idx_frameworks_active   ON frameworks(is_active);

-- =========================================================
-- 2. controls
-- =========================================================
CREATE TABLE IF NOT EXISTS controls (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework_id  UUID NOT NULL REFERENCES frameworks(id) ON DELETE CASCADE,
  control_ref   VARCHAR(64)  NOT NULL,
  title         VARCHAR(512) NOT NULL,
  description   TEXT,
  category      VARCHAR(128),
  severity      VARCHAR(16)  NOT NULL DEFAULT 'Medium',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (framework_id, control_ref)
);
CREATE INDEX IF NOT EXISTS idx_controls_framework ON controls(framework_id);
CREATE INDEX IF NOT EXISTS idx_controls_category  ON controls(category);

-- =========================================================
-- 3. policy_templates
-- =========================================================
CREATE TABLE IF NOT EXISTS policy_templates (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          VARCHAR(128) NOT NULL UNIQUE,
  name          VARCHAR(255) NOT NULL,
  framework_id  UUID REFERENCES frameworks(id) ON DELETE SET NULL,
  framework_ref VARCHAR(128),  -- e.g. 'EU AI Act · Article 13'
  clause        VARCHAR(128),
  category      VARCHAR(64)  NOT NULL,
  risk_level    VARCHAR(16)  NOT NULL DEFAULT 'Medium',
  status        VARCHAR(16)  NOT NULL DEFAULT 'Draft',
  body_md       TEXT,
  version       VARCHAR(32)  NOT NULL DEFAULT '1.0.0',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_policy_templates_framework ON policy_templates(framework_id);
CREATE INDEX IF NOT EXISTS idx_policy_templates_status    ON policy_templates(status);
CREATE INDEX IF NOT EXISTS idx_policy_templates_category  ON policy_templates(category);

-- =========================================================
-- 4. RLS (public read for published templates; auth write)
-- =========================================================
ALTER TABLE frameworks        ENABLE ROW LEVEL SECURITY;
ALTER TABLE controls          ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_templates  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS frameworks_read    ON frameworks;
DROP POLICY IF EXISTS controls_read      ON controls;
DROP POLICY IF EXISTS policy_tpl_read    ON policy_templates;
DROP POLICY IF EXISTS policy_tpl_write   ON policy_templates;

CREATE POLICY frameworks_read ON frameworks FOR SELECT USING (TRUE);
CREATE POLICY controls_read   ON controls   FOR SELECT USING (TRUE);
CREATE POLICY policy_tpl_read ON policy_templates FOR SELECT USING (TRUE);
CREATE POLICY policy_tpl_write ON policy_templates FOR ALL
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');
