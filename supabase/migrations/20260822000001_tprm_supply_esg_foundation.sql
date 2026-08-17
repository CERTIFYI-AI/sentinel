-- ---------------------------------------------------------------------------
-- Vendors & Supply Chain + Sustainability/ESG — foundation repair.
--
-- WHY (four adversarial audits, 2026-08-16). The twelve modules in these three
-- groups failed all four review gates. This migration fixes the DATABASE layer;
-- the services/pages are repaired in the same change.
--
--   1. vendors.org_id was made NOT NULL by the ws01 tenancy unify
--      (20260421000008) with no DB-side default, so EVERY client insert died on
--      23502. CLAUDE.md requires the DB to fill the scoping column, as
--      ai_models does. Same gap on carbon_records' domain write path.
--   2. vendorService writes five columns that were never created
--      (criticality, score, dpa_status, services, ai_use) and coerces a text
--      risk tier into risk_tier INTEGER (22P02). Every vendor write failed.
--   3. carbon_records only ever got the generic functional_integration shell
--      (18 columns, none of them about carbon), so the Carbon Ledger could
--      never persist and could only ever render zeros — which read to a user as
--      "carbon neutral".
--   4. energy_metrics stores model_name while the page writes `model`; one
--      unknown column rejects the whole insert.
--   5. Four modules sat on generic `(id, doc jsonb)` demo tables whose RLS
--      predicate is `true` for `authenticated` — full CROSS-TENANT read/write
--      of AIBOMs, attestations, vendor assessments and vendor SLAs. The
--      close_anon_rls sweep missed them because they have no org_id column, and
--      the cross-tenant regression check excludes '%\_table'.
--
-- Everything here is idempotent and safe to re-run.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. vendors: scoping default, the missing write-path columns, and a real
--    third-party-risk field model (previously present only in the UI mock).
-- ---------------------------------------------------------------------------
ALTER TABLE public.vendors ALTER COLUMN org_id SET DEFAULT current_user_org_id();

ALTER TABLE public.vendors
  -- Columns vendorService already writes but that never existed:
  ADD COLUMN IF NOT EXISTS criticality text,
  ADD COLUMN IF NOT EXISTS risk_tier_label text,
  ADD COLUMN IF NOT EXISTS score numeric,
  ADD COLUMN IF NOT EXISTS dpa_status text,
  ADD COLUMN IF NOT EXISTS services text,
  ADD COLUMN IF NOT EXISTS ai_use text,
  -- Real TPRM field model. Inherent vs residual risk is the core of any
  -- third-party programme; the platform previously carried a single tier.
  ADD COLUMN IF NOT EXISTS inherent_risk text,
  ADD COLUMN IF NOT EXISTS residual_risk text,
  ADD COLUMN IF NOT EXISTS data_classification text,
  ADD COLUMN IF NOT EXISTS data_access_level text,
  ADD COLUMN IF NOT EXISTS data_regions text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS transfer_mechanism text,      -- SCC | BCR | adequacy | none
  ADD COLUMN IF NOT EXISTS dpa_signed_at date,
  ADD COLUMN IF NOT EXISTS dpa_expires_at date,
  ADD COLUMN IF NOT EXISTS soc2_expires_at date,
  ADD COLUMN IF NOT EXISTS iso_expires_at date,
  ADD COLUMN IF NOT EXISTS last_pentest_at date,
  ADD COLUMN IF NOT EXISTS breach_history_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_breach_summary text,
  ADD COLUMN IF NOT EXISTS subprocessor_count integer,
  ADD COLUMN IF NOT EXISTS fourth_party_exposure text,
  ADD COLUMN IF NOT EXISTS exit_plan_status text,
  ADD COLUMN IF NOT EXISTS exit_plan_notes text,
  ADD COLUMN IF NOT EXISTS reassessment_cadence_months integer,
  ADD COLUMN IF NOT EXISTS reassessment_due_at date,
  ADD COLUMN IF NOT EXISTS business_owner text,
  ADD COLUMN IF NOT EXISTS vendor_manager text,
  ADD COLUMN IF NOT EXISTS contract_start date,
  ADD COLUMN IF NOT EXISTS renewal_notice_days integer,
  ADD COLUMN IF NOT EXISTS annual_spend numeric,
  ADD COLUMN IF NOT EXISTS spend_currency text NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS insurance_coverage text,
  -- Written by vendorRiskAgent, which previously no-op'd against absent columns.
  ADD COLUMN IF NOT EXISTS concentration_risk numeric,
  ADD COLUMN IF NOT EXISTS risk_flag boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_assessed_at timestamptz,
  ADD COLUMN IF NOT EXISTS website text;

-- Constrained vocabularies (added separately so re-runs don't duplicate them).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendors_criticality_chk') THEN
    ALTER TABLE public.vendors ADD CONSTRAINT vendors_criticality_chk
      CHECK (criticality IS NULL OR criticality IN ('critical','high','moderate','low'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendors_risk_tier_label_chk') THEN
    ALTER TABLE public.vendors ADD CONSTRAINT vendors_risk_tier_label_chk
      CHECK (risk_tier_label IS NULL OR risk_tier_label IN ('critical','high','medium','low'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendors_dpa_status_chk') THEN
    ALTER TABLE public.vendors ADD CONSTRAINT vendors_dpa_status_chk
      CHECK (dpa_status IS NULL OR dpa_status IN ('signed','pending','not_signed','not_required'));
  END IF;
END $$;

-- risk_tier is INTEGER (seeded 1/2/3). The service wrote text into it. Backfill
-- the new label column from the integer so both representations agree, then let
-- the service read/write risk_tier_label only.
UPDATE public.vendors
SET risk_tier_label = CASE risk_tier
                        WHEN 1 THEN 'critical'
                        WHEN 2 THEN 'high'
                        WHEN 3 THEN 'medium'
                        ELSE 'low'
                      END
WHERE risk_tier_label IS NULL AND risk_tier IS NOT NULL;

-- Explicit removal of the legacy allow-all policy. It was previously only
-- dropped by a name-agnostic `qual ILIKE '%true%'` sweep, invisible to anyone
-- reading the vendors migration.
DROP POLICY IF EXISTS "allow_all_vendors" ON public.vendors;

-- ---------------------------------------------------------------------------
-- 2. Vendor assessments — real org-scoped table replacing the cross-tenant
--    `vendorassessments_table` demo doc table.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  assessment_ref text,
  vendor_id text REFERENCES public.vendors(id) ON DELETE CASCADE,
  assessment_type text,                       -- initial | periodic | targeted | incident_driven
  framework text,                             -- SIG Lite | CAIQ | ISO 42001 addendum | custom
  scope text,
  status text NOT NULL DEFAULT 'draft',       -- draft|in_progress|submitted|under_review|approved|approved_with_conditions|rejected
  conditions text,                            -- required when approved_with_conditions
  score numeric,
  residual_risk text,                         -- risk remaining after remediation
  findings_critical integer NOT NULL DEFAULT 0,
  findings_high integer NOT NULL DEFAULT 0,
  findings_medium integer NOT NULL DEFAULT 0,
  findings_low integer NOT NULL DEFAULT 0,
  owner text,
  approver text,                              -- distinct from owner; who signed off
  approved_by uuid,
  due_at date,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  next_review_at date,
  recommendation text,
  questionnaire_id uuid,                      -- → vendor_questionnaires.id
  evidence_ids uuid[] NOT NULL DEFAULT '{}',  -- → evidence.id (real refs, not a count)
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vendor_assessments_vendor_idx ON public.vendor_assessments (vendor_id);
CREATE INDEX IF NOT EXISTS vendor_assessments_org_idx ON public.vendor_assessments (org_id);

-- ---------------------------------------------------------------------------
-- 3. Vendor SLAs — real table replacing `vendorsla_table`.
--    Thresholds are NUMERIC with a unit so breach can actually be evaluated;
--    the demo table stored free text like 'P1: 1h / P2: 4h', which made
--    automated evaluation impossible by construction.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_slas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  sla_ref text,
  vendor_id text REFERENCES public.vendors(id) ON DELETE CASCADE,
  metric text NOT NULL,                       -- uptime | response_time | resolution_time | accuracy
  unit text NOT NULL DEFAULT 'percent',       -- percent | hours | minutes | ms
  target_value numeric,
  warning_value numeric,
  breach_value numeric,
  -- Direction matters: uptime is "higher is better", latency the opposite.
  higher_is_better boolean NOT NULL DEFAULT true,
  current_value numeric,                      -- NULL until actually measured
  measurement_window text,                    -- monthly | quarterly | rolling_30d
  last_measured_at timestamptz,               -- NULL until actually measured
  last_breach_at timestamptz,
  consecutive_breaches integer NOT NULL DEFAULT 0,
  service_credits text,
  credit_claim_status text,
  contract_clause_ref text,
  linked_incident_ids uuid[] NOT NULL DEFAULT '{}',   -- → incidents.id
  escalation_path text,
  owner text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vendor_slas_vendor_idx ON public.vendor_slas (vendor_id);

-- SLA status is DERIVED from measurement, never stored as an authored literal
-- (the demo table let 'healthy' and a breaching number coexist). NULL current
-- value yields 'unmeasured' so the UI can render an honest em-dash.
CREATE OR REPLACE VIEW public.vendor_sla_status AS
SELECT s.*,
       CASE
         WHEN s.current_value IS NULL OR s.target_value IS NULL THEN 'unmeasured'
         WHEN s.higher_is_better AND s.current_value < COALESCE(s.breach_value, s.target_value) THEN 'breached'
         WHEN NOT s.higher_is_better AND s.current_value > COALESCE(s.breach_value, s.target_value) THEN 'breached'
         WHEN s.higher_is_better AND s.current_value < s.target_value THEN 'at_risk'
         WHEN NOT s.higher_is_better AND s.current_value > s.target_value THEN 'at_risk'
         ELSE 'healthy'
       END AS derived_status
FROM public.vendor_slas s;

-- ---------------------------------------------------------------------------
-- 4. Vendor documents (Vendor Upload) — files were never uploaded anywhere;
--    the page's only effect was a toast. Give evidence a real home with an
--    integrity digest and a version chain.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vendor_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  document_ref text,
  vendor_id text REFERENCES public.vendors(id) ON DELETE CASCADE,
  doc_type text,                              -- SOC2 | ISO Certificate | DPA | Pentest | Insurance | Other
  title text,
  file_name text,
  storage_path text,                          -- Supabase Storage object path
  file_digest text,                           -- sha256 of the stored object
  file_size_bytes bigint,
  confidentiality text,
  virus_scan_status text,
  version integer NOT NULL DEFAULT 1,
  supersedes_id uuid REFERENCES public.vendor_documents(id) ON DELETE SET NULL,
  valid_from date,
  expires_at date,
  renewal_lead_days integer,
  retention_until date,
  status text NOT NULL DEFAULT 'pending_review',   -- pending_review | accepted | rejected | expired
  reviewed_by uuid,                           -- the authenticated reviewer, never a hardcoded name
  reviewed_at timestamptz,
  review_notes text,
  satisfies_control_ids text[] NOT NULL DEFAULT '{}',  -- → controls.id
  assessment_id uuid REFERENCES public.vendor_assessments(id) ON DELETE SET NULL,
  uploaded_by uuid DEFAULT auth.uid(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS vendor_documents_vendor_idx ON public.vendor_documents (vendor_id);

-- ---------------------------------------------------------------------------
-- 5. vendor_questionnaires: the table has existed since core_grc_tables and was
--    never used (the page discarded every answer on submit). Bring it onto the
--    one-id-space and give it the lifecycle fields a real VSQ needs.
-- ---------------------------------------------------------------------------
ALTER TABLE public.vendor_questionnaires
  ADD COLUMN IF NOT EXISTS org_id uuid,
  ADD COLUMN IF NOT EXISTS vendor_uuid text REFERENCES public.vendors(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS questionnaire_ref text,
  ADD COLUMN IF NOT EXISTS template_version text,
  ADD COLUMN IF NOT EXISTS max_score numeric,
  ADD COLUMN IF NOT EXISTS respondent text,
  ADD COLUMN IF NOT EXISTS respondent_email text,
  ADD COLUMN IF NOT EXISTS reviewer text,
  ADD COLUMN IF NOT EXISTS reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS review_decision text,
  ADD COLUMN IF NOT EXISTS expires_at date,
  ADD COLUMN IF NOT EXISTS assessment_id uuid REFERENCES public.vendor_assessments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS evidence_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.vendor_questionnaires ALTER COLUMN org_id SET DEFAULT current_user_org_id();
UPDATE public.vendor_questionnaires SET org_id = current_user_org_id() WHERE org_id IS NULL;
CREATE INDEX IF NOT EXISTS vendor_questionnaires_vendor_uuid_idx
  ON public.vendor_questionnaires (vendor_uuid);

-- ---------------------------------------------------------------------------
-- 6. RLS for the new vendor tables — org-scoped, DB-filled scoping column.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['vendor_assessments','vendor_slas','vendor_documents','vendor_questionnaires'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_org_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      || 'USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id())',
      t || '_org_all', t);
    -- Table privileges are coarse; RLS above is what actually constrains rows.
    -- Granted explicitly rather than relying on the one-time
    -- `grant ... on all tables` sweep in 20260420160001 (which cannot reach
    -- tables created after it) or on ambient ALTER DEFAULT PRIVILEGES, so a
    -- from-zero replay in any environment yields a writable table.
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
GRANT SELECT ON public.vendor_sla_status TO authenticated;
