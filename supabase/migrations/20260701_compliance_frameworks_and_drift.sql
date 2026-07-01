-- Compliance Mapping Agent v2 — Step 0 (frameworks seed) + Step 6 (drift infra)
--
-- NOTE: matched to THIS project's real schema, not the generic spec:
--   * regulation_entries: (name, jurisdiction, status, effective_date, requirements_summary…)
--   * controls: (org_id, framework, control_id, title, description, status, evidence_count)
--     — extended below with severity / clause_reference / evaluation_type / is_default.
-- Defensive + idempotent (IF NOT EXISTS / ON CONFLICT DO NOTHING). Apply with
-- `supabase db push`. The 92 atomic controls are the frontend source of truth in
-- dashboard/src/data/complianceLibrary.ts and can be bulk-loaded from there.

-- ── Step 6a/6b tables: control evaluation history + regulatory source monitors ──
CREATE TABLE IF NOT EXISTS control_evaluation_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     TEXT NOT NULL DEFAULT 'default',
  control_id    UUID,
  control_code  TEXT NOT NULL,
  status        TEXT NOT NULL,                 -- PASS | FAIL | NOT_EVALUATED | MANUAL
  metric_value  NUMERIC(6,4),
  frameworks    JSONB DEFAULT '[]',
  reason        TEXT,
  evaluated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ceh_control_code_time ON control_evaluation_history (control_code, evaluated_at DESC);

CREATE TABLE IF NOT EXISTS regulatory_source_monitors (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework    TEXT NOT NULL,
  url          TEXT NOT NULL,
  last_hash    TEXT,
  last_checked TIMESTAMPTZ,
  is_active    BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS regulatory_change_events (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  framework    TEXT NOT NULL,
  source_url   TEXT NOT NULL,
  old_hash     TEXT,
  new_hash     TEXT,
  detected_at  TIMESTAMPTZ DEFAULT now(),
  status       TEXT DEFAULT 'PENDING_REVIEW',  -- PENDING_REVIEW | REVIEWED_NO_ACTION | CONTROLS_UPDATED
  reviewed_by  UUID,
  reviewed_at  TIMESTAMPTZ,
  review_notes TEXT
);

-- ── Extend `controls` with the atomic-control governance metadata ──
ALTER TABLE controls ADD COLUMN IF NOT EXISTS severity         TEXT;   -- CRITICAL | HIGH | MEDIUM | LOW
ALTER TABLE controls ADD COLUMN IF NOT EXISTS clause_reference TEXT;
ALTER TABLE controls ADD COLUMN IF NOT EXISTS evaluation_type  TEXT;   -- AUTO | MANUAL
ALTER TABLE controls ADD COLUMN IF NOT EXISTS is_default       BOOLEAN DEFAULT false;

-- ── Step 0: seed the 11 default frameworks into regulation_entries ──
INSERT INTO regulation_entries (id, tenant_id, name, jurisdiction, status, effective_date, requirements_summary)
VALUES
  (gen_random_uuid(), 'default', 'EU AI Act',                    'EU',     'ACTIVE', '2024-08-01', 'EU regulation on artificial intelligence systems (2024/1689)'),
  (gen_random_uuid(), 'default', 'GDPR',                         'EU',     'ACTIVE', '2018-05-25', 'EU General Data Protection Regulation (2016/679)'),
  (gen_random_uuid(), 'default', 'Google SAIF',                  'GLOBAL', 'ACTIVE', '2023-06-08', 'Google Secure AI Framework for securing AI systems (1.0)'),
  (gen_random_uuid(), 'default', 'ISO/IEC 42001',                'GLOBAL', 'ACTIVE', '2023-12-01', 'International standard for AI management systems (2023)'),
  (gen_random_uuid(), 'default', 'MITRE ATLAS',                  'GLOBAL', 'ACTIVE', '2022-01-01', 'Adversarial Threat Landscape for AI Systems (2024)'),
  (gen_random_uuid(), 'default', 'NIST AI RMF 1.0',              'US',     'ACTIVE', '2023-01-26', 'NIST AI Risk Management Framework (1.0)'),
  (gen_random_uuid(), 'default', 'OECD AI Principles',           'GLOBAL', 'ACTIVE', '2019-05-22', 'OECD principles for trustworthy AI stewardship (2024)'),
  (gen_random_uuid(), 'default', 'OWASP LLM Top 10',             'GLOBAL', 'ACTIVE', '2023-10-01', 'Security risks specific to LLM applications (2025)'),
  (gen_random_uuid(), 'default', 'Singapore Model AI Framework', 'APAC',   'ACTIVE', '2024-05-01', 'Singapore framework for responsible AI governance (2.0)'),
  (gen_random_uuid(), 'default', 'UNESCO Ethics of AI',          'GLOBAL', 'ACTIVE', '2021-11-23', 'UNESCO recommendation on the ethics of AI (2021)'),
  (gen_random_uuid(), 'default', 'India AI Governance Guidelines','IN',    'ACTIVE', '2024-01-01', 'India IndiaAI / MeitY responsible AI guidelines (2024)')
ON CONFLICT DO NOTHING;

-- Realtime: drift alerts are emitted into the existing realtime alerts channel by
-- the backend evaluation cycle (see sentinel/compliance). The frontend subscribes
-- via Supabase Realtime — no polling.
