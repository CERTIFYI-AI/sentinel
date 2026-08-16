-- 20260821000001_compliance_write_path_repair.sql
--
-- COMPLIANCE & REGULATORY write-path repair (2026-08-16 compliance re-audit).
--
-- Root cause being healed: the tenancy era added `org_id NOT NULL` columns to
-- the compliance cluster WITHOUT DB defaults (only tenant_id got a default),
-- so every client insert/upsert dies on the NOT NULL — the services correctly
-- never send scoping columns per the platform contract ("let the DB default
-- current_user_org_id() fill it, as ai_models does"). This file restores the
-- contract, closes the RLS holes the re-audit found, converts
-- policies.content to the structured jsonb shape the UI renders, and creates
-- the realtime_alerts table both the Python drift pipeline (producer) and
-- useControlDriftAlerts (consumer) reference but no migration ever created.
-- Idempotent throughout.

-- ---------------------------------------------------------------------------
-- 1a. org_id defaults on the compliance cluster (2026-08-16 re-audit: every
--     authenticated insert failed with "null value in column org_id" because
--     the tenancy migrations left these six tables without the platform's
--     DB-side default). SET DEFAULT is naturally idempotent.
-- ---------------------------------------------------------------------------
ALTER TABLE public.policies        ALTER COLUMN org_id SET DEFAULT current_user_org_id();
ALTER TABLE public.policy_versions ALTER COLUMN org_id SET DEFAULT current_user_org_id();
ALTER TABLE public.documents       ALTER COLUMN org_id SET DEFAULT current_user_org_id();
ALTER TABLE public.approvals       ALTER COLUMN org_id SET DEFAULT current_user_org_id();
ALTER TABLE public.controls        ALTER COLUMN org_id SET DEFAULT current_user_org_id();
ALTER TABLE public.control_tests   ALTER COLUMN org_id SET DEFAULT current_user_org_id();

-- conformity_assessments: text PK with NO default at all (clients cannot mint
-- an id) and org_id without a default — both fatal for the write path.
ALTER TABLE public.conformity_assessments ALTER COLUMN id     SET DEFAULT (gen_random_uuid())::text;
ALTER TABLE public.conformity_assessments ALTER COLUMN org_id SET DEFAULT current_user_org_id();

-- approvals.tenant_id defaulted to the literal 'default', which silently
-- breaks the tenant-scoped policies (re-audit finding: rows landed in the
-- 'default' tenant, invisible to their own org). Align with the platform.
ALTER TABLE public.approvals ALTER COLUMN tenant_id SET DEFAULT (current_user_org_id())::text;

-- Heal the rows the literal-'default' era already stranded: they carry a
-- real org_id but a 'default' tenant_id, so the tenant-scoped policies hide
-- them from their own org (same heal 20260820000001 applied to
-- controls/evidence/policies). Idempotent — only touches known-bad rows.
UPDATE public.approvals              SET tenant_id = org_id::text WHERE tenant_id = 'default' AND org_id IS NOT NULL;
UPDATE public.conformity_assessments SET tenant_id = org_id::text WHERE tenant_id = 'default' AND org_id IS NOT NULL;
UPDATE public.remediation_plans      SET tenant_id = org_id::text WHERE tenant_id = 'default' AND org_id IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 1b. RLS repairs (2026-08-16 re-audit).
-- ---------------------------------------------------------------------------
-- audit_findings: ws02_catalog_read had qual `true` — every tenant could read
-- every other tenant's audit findings. ws02_catalog_svc duplicated
-- ws01_service_all (verified present), so service-role access survives.
DROP POLICY IF EXISTS ws02_catalog_read ON public.audit_findings;
DROP POLICY IF EXISTS ws02_catalog_svc  ON public.audit_findings;

-- control_evaluation_history: created with RLS disabled — any authenticated
-- user could read/write every tenant's control drift history. Enable RLS and
-- scope on tenant_id (the column the drift pipeline writes).
ALTER TABLE public.control_evaluation_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ceh_org_all ON public.control_evaluation_history;
CREATE POLICY ceh_org_all ON public.control_evaluation_history
  FOR ALL TO authenticated
  USING (tenant_id = (current_user_org_id())::text)
  WITH CHECK (tenant_id = (current_user_org_id())::text);
DROP POLICY IF EXISTS ceh_service_all ON public.control_evaluation_history;
CREATE POLICY ceh_service_all ON public.control_evaluation_history
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Append-only audit chain (EU AI Act Art. 12): audit_log carries
-- ws03_deny_update/ws03_deny_delete, but permissive policies OR together, so
-- the ws01_org_update / ws01_org_delete grants made the deny policies
-- meaningless — an authenticated user could rewrite their own audit trail.
-- Drop the permissive UPDATE/DELETE grants on both audit tables (INSERT,
-- SELECT and service_role policies are intentionally kept).
DROP POLICY IF EXISTS ws01_org_update ON public.audit_log;
DROP POLICY IF EXISTS ws01_org_delete ON public.audit_log;
DROP POLICY IF EXISTS ws01_org_update ON public.audit_logs;
DROP POLICY IF EXISTS ws01_org_delete ON public.audit_logs;

-- ---------------------------------------------------------------------------
-- 1c. policies.content text -> jsonb (2026-08-16 re-audit: the editor writes
--     the structured {summary, sections[]} shape but the column is text, so
--     structured content round-trips as an escaped string). Preserves both
--     legacy shapes: JSON-ish text is parsed, prose is wrapped. Guarded on
--     information_schema for idempotency.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'policies'
      AND column_name = 'content' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.policies
      ALTER COLUMN content TYPE jsonb
      USING (CASE
               WHEN content IS NULL THEN NULL
               WHEN content ~ '^\s*[{[]' THEN content::jsonb
               ELSE jsonb_build_object('summary', content, 'sections', '[]'::jsonb)
             END);
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1d. Legacy status normalization: 'approved' predates the
--     draft -> in_review -> published lifecycle enum; 9 of the 12 seeded
--     policies were invisible to the published-policy KPIs and the employee
--     share flow. Backfill approved_at so the lifecycle stays auditable.
-- ---------------------------------------------------------------------------
UPDATE public.policies
SET status = 'published', approved_at = COALESCE(approved_at, updated_at)
WHERE status = 'approved';

-- ---------------------------------------------------------------------------
-- 1e. policy_versions.policy_id text -> uuid + real FK (2026-08-16 re-audit:
--     one-id-space violation — versions pointed at policies by unconstrained
--     text). Table is empty everywhere (writes were broken by the org_id
--     default gap this file fixes), so the cast is safe; guarded on the
--     current type for idempotency. Version writes are governance events:
--     add the same trg_audit the parent table carries (Art. 12).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'policy_versions'
      AND column_name = 'policy_id' AND data_type = 'text'
  ) THEN
    ALTER TABLE public.policy_versions
      ALTER COLUMN policy_id TYPE uuid USING (policy_id::uuid);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'policy_versions_policy_id_fkey'
      AND conrelid = 'public.policy_versions'::regclass
  ) THEN
    ALTER TABLE public.policy_versions
      ADD CONSTRAINT policy_versions_policy_id_fkey
      FOREIGN KEY (policy_id) REFERENCES public.policies(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_audit ON public.policy_versions;
CREATE TRIGGER trg_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.policy_versions
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

-- ---------------------------------------------------------------------------
-- 1f. post_market_events FK hygiene (2026-08-16 re-audit): deleting a
--     post-market plan must NOT destroy the Art. 72 event ledger — the UI
--     already promises "events remain" on plan deletion, but the FK said
--     ON DELETE CASCADE. plan_id is already nullable (verified). Also add the
--     missing incident interlink FK so escalations stay id-space-clean.
-- ---------------------------------------------------------------------------
DO $$
DECLARE fk_def text;
BEGIN
  SELECT pg_get_constraintdef(oid) INTO fk_def
  FROM pg_constraint
  WHERE conname = 'post_market_events_plan_id_fkey'
    AND conrelid = 'public.post_market_events'::regclass;
  IF fk_def IS NOT NULL AND fk_def LIKE '%ON DELETE CASCADE%' THEN
    ALTER TABLE public.post_market_events DROP CONSTRAINT post_market_events_plan_id_fkey;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'post_market_events_plan_id_fkey'
      AND conrelid = 'public.post_market_events'::regclass
  ) THEN
    ALTER TABLE public.post_market_events
      ADD CONSTRAINT post_market_events_plan_id_fkey
      FOREIGN KEY (plan_id) REFERENCES public.post_market_plans(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'post_market_events_incident_id_fkey'
      AND conrelid = 'public.post_market_events'::regclass
  ) THEN
    ALTER TABLE public.post_market_events
      ADD CONSTRAINT post_market_events_incident_id_fkey
      FOREIGN KEY (incident_id) REFERENCES public.incidents(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 1g. regulator_filings.filing_ref mint trigger (2026-08-16 re-audit: the UI
--     displays filing_ref as the record identity but nothing ever minted one,
--     so client-created filings rendered blank refs). Per-org FIL-<year>-NNNN;
--     count+1 is sufficient at this volume and stays org-scoped under RLS.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.fn_mint_filing_ref()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.filing_ref IS NULL OR NEW.filing_ref = '' THEN
    SELECT 'FIL-' || to_char(now(), 'YYYY') || '-' || lpad((count(*) + 1)::text, 4, '0')
      INTO NEW.filing_ref
      FROM public.regulator_filings
     WHERE org_id = NEW.org_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mint_filing_ref ON public.regulator_filings;
CREATE TRIGGER trg_mint_filing_ref
  BEFORE INSERT ON public.regulator_filings
  FOR EACH ROW
  WHEN (NEW.filing_ref IS NULL)
  EXECUTE FUNCTION public.fn_mint_filing_ref();

-- ---------------------------------------------------------------------------
-- 1h. realtime_alerts (2026-08-16 re-audit: the Python drift pipeline
--     (sentinel/compliance/drift_detector.py) INSERTs into realtime_alerts
--     and useControlDriftAlerts subscribes to it, but no migration ever
--     created the table — the drift alert path was dead on every fresh
--     environment). Columns match the producer exactly:
--     (id, tenant_id, alert_type, title, message, payload, created_at).
--     Org-scoped with RLS; org_id is backfilled from tenant_id for the
--     service-side producer, which sends tenant_id only.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.realtime_alerts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL DEFAULT current_user_org_id(),
  tenant_id  text NOT NULL DEFAULT (current_user_org_id())::text,
  alert_type text NOT NULL,
  title      text NOT NULL,
  message    text,
  payload    jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- The drift pipeline (asyncpg, service credentials) sends tenant_id but not
-- org_id; auth.uid() is NULL there, so the column default cannot fill it.
-- Backfill org_id from tenant_id before the NOT NULL is enforced.
CREATE OR REPLACE FUNCTION public.fn_realtime_alerts_org_backfill()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.org_id IS NULL THEN
    NEW.org_id := NULLIF(NEW.tenant_id, '')::uuid;
  END IF;
  IF NEW.tenant_id IS NULL OR NEW.tenant_id = '' THEN
    NEW.tenant_id := (NEW.org_id)::text;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_realtime_alerts_org ON public.realtime_alerts;
CREATE TRIGGER trg_realtime_alerts_org
  BEFORE INSERT ON public.realtime_alerts
  FOR EACH ROW EXECUTE FUNCTION public.fn_realtime_alerts_org_backfill();

CREATE INDEX IF NOT EXISTS idx_realtime_alerts_org_created
  ON public.realtime_alerts (org_id, created_at DESC);

ALTER TABLE public.realtime_alerts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS realtime_alerts_org_all ON public.realtime_alerts;
CREATE POLICY realtime_alerts_org_all ON public.realtime_alerts
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());
DROP POLICY IF EXISTS realtime_alerts_service_all ON public.realtime_alerts;
CREATE POLICY realtime_alerts_service_all ON public.realtime_alerts
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- ---------------------------------------------------------------------------
-- 1i. Realtime publication membership (2026-08-16 re-audit: the dashboard
--     subscribes to postgres_changes on these tables but they were never
--     added to supabase_realtime, so the live views silently never updated).
--     policy_acknowledgments is created in 20260821000002 and gets its
--     publication add THERE — never referenced here.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'controls', 'audits', 'audit_findings', 'control_tests',
    'control_evaluation_history', 'evidence_chain', 'regulator_filings',
    'tabletop_exercises', 'ai_trainings', 'agent_executions',
    'policies', 'policy_versions', 'realtime_alerts'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;
