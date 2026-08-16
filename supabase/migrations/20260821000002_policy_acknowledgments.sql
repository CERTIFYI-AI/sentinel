-- 20260821000002_policy_acknowledgments.sql
--
-- Policy employee share/sign lifecycle (2026-08-16 compliance re-audit).
--
-- Why: EU AI Act Art. 4 and ISO/IEC 42001 A.4.4 require DEMONSTRABLE staff
-- awareness of the AI policies that govern their work. Nothing stores an
-- acknowledgment today — the counters on policies (acknowledgment_count /
-- attestations / total_users) have no writer anywhere in the codebase, so the
-- policy pages rendered dormant zeros as if they were measurements. This
-- table is the real record: one row per person per policy version, sourced
-- either manually or from a completed training, interlinked to policies and
-- ai_trainings by uuid (one-id-space rule).

-- ---------------------------------------------------------------------------
-- 2a. Table (org-scoped, RLS, platform defaults fill scoping DB-side).
--     org_id carries the platform's prevailing organizations(id) FK
--     (ON DELETE RESTRICT — same as policies/documents/controls).
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.policy_acknowledgments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL DEFAULT current_user_org_id()
                  REFERENCES public.organizations(id) ON DELETE RESTRICT,
  policy_id       uuid NOT NULL REFERENCES public.policies(id) ON DELETE CASCADE,
  policy_version  text,
  person_name     text NOT NULL,
  person_email    text,
  source          text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'training')),
  training_id     uuid REFERENCES public.ai_trainings(id) ON DELETE SET NULL,
  status          text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'acknowledged', 'declined')),
  acknowledged_at timestamptz,
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (policy_id, person_email, policy_version)
);

CREATE INDEX IF NOT EXISTS idx_policy_acknowledgments_policy
  ON public.policy_acknowledgments (policy_id);
CREATE INDEX IF NOT EXISTS idx_policy_acknowledgments_org
  ON public.policy_acknowledgments (org_id);

ALTER TABLE public.policy_acknowledgments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_acknowledgments_org_all ON public.policy_acknowledgments;
CREATE POLICY policy_acknowledgments_org_all ON public.policy_acknowledgments
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());
DROP POLICY IF EXISTS policy_acknowledgments_service_all ON public.policy_acknowledgments;
CREATE POLICY policy_acknowledgments_service_all ON public.policy_acknowledgments
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

-- Acknowledgments are governance evidence: audit every write (Art. 12),
-- matching the trg_audit the rest of the compliance cluster carries.
DROP TRIGGER IF EXISTS trg_audit ON public.policy_acknowledgments;
CREATE TRIGGER trg_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.policy_acknowledgments
  FOR EACH ROW EXECUTE FUNCTION fn_audit_trigger();

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.policy_acknowledgments;
CREATE TRIGGER trg_set_updated_at
  BEFORE UPDATE ON public.policy_acknowledgments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Realtime: the acknowledgment tracker is a live view (this table is created
-- HERE, so its publication add lives here, not in 20260821000001).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public'
      AND tablename = 'policy_acknowledgments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.policy_acknowledgments;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2b. Drop the dormant dead counters on policies (2026-08-16 re-audit:
--     no writer anywhere in services, hooks or pipelines — they only ever
--     displayed fabricated zeros; acknowledgment truth now lives in
--     policy_acknowledgments and is aggregated at read time).
-- ---------------------------------------------------------------------------
ALTER TABLE public.policies DROP COLUMN IF EXISTS acknowledgment_count;
ALTER TABLE public.policies DROP COLUMN IF EXISTS attestations;
ALTER TABLE public.policies DROP COLUMN IF EXISTS total_users;

-- ---------------------------------------------------------------------------
-- 2c. Demo seeds (FICTIONAL Nepali-bank narrative — attendee names are the
--     role-based fictional people already present in ai_trainings.attendees,
--     not real persons; emails are derived fictional addresses). Rows are
--     sourced from completed/enrolled training attendance for trainings that
--     link a policy, so the training -> policy -> acknowledgment interlink
--     chain is real and queryable in both directions. Natural-key NOT EXISTS
--     guards; first (completed-preferred) training wins per person+policy.
-- ---------------------------------------------------------------------------
DO $ack$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
BEGIN
  INSERT INTO public.policy_acknowledgments
    (org_id, policy_id, policy_version, person_name, person_email,
     source, training_id, status, acknowledged_at, note)
  SELECT
    v_org,
    s.policy_id,
    s.policy_version,
    s.person_name,
    s.person_email,
    'training',
    s.training_id,
    CASE s.att_status
      WHEN 'completed' THEN 'acknowledged'
      WHEN 'exempted'  THEN 'declined'
      ELSE 'pending'
    END,
    CASE WHEN s.att_status = 'completed' THEN COALESCE(s.completed_at::timestamptz, s.ends_on::timestamptz) END,
    CASE WHEN s.att_status = 'exempted'
         THEN 'Exempted from the ' || s.training_name || ' cohort; acknowledgment declined pending role review (fictional demo data).'
    END
  FROM (
    SELECT DISTINCT ON (t.linked_policy_id, att->>'name')
      t.id AS training_id,
      t.name AS training_name,
      t.ends_on,
      t.linked_policy_id AS policy_id,
      p.version AS policy_version,
      att->>'name' AS person_name,
      trim(BOTH '.' FROM lower(regexp_replace(att->>'name', '[^a-zA-Z]+', '.', 'g')))
        || '@himal-bank.example.np' AS person_email,
      att->>'status' AS att_status,
      att->>'completedAt' AS completed_at
    FROM public.ai_trainings t
    JOIN public.policies p ON p.id = t.linked_policy_id
    CROSS JOIN LATERAL jsonb_array_elements(t.attendees) att
    WHERE t.org_id = v_org
      AND t.linked_policy_id IS NOT NULL
    ORDER BY t.linked_policy_id, att->>'name',
             (att->>'status' = 'completed') DESC, t.training_ref
  ) s
  WHERE NOT EXISTS (
    SELECT 1 FROM public.policy_acknowledgments pa
    WHERE pa.policy_id = s.policy_id
      AND pa.person_name = s.person_name
      AND COALESCE(pa.policy_version, '') = COALESCE(s.policy_version, '')
  );
END $ack$;

-- Verification (run in replay after apply):
--   SELECT count(*) AS total,
--          count(*) FILTER (WHERE p.id IS NOT NULL) AS policy_resolves,
--          count(*) FILTER (WHERE pa.training_id IS NULL OR t.id IS NOT NULL) AS training_resolves
--   FROM policy_acknowledgments pa
--   LEFT JOIN policies p ON p.id = pa.policy_id
--   LEFT JOIN ai_trainings t ON t.id = pa.training_id;
