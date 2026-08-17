-- Fix 5: Risk schema extension - inherent/residual, appetite, treatment, KRI
-- Replay-safety guard: risks is created later in 20260418000002_core_grc_tables.sql
-- On the live database this migration already ran when risks existed, so the
-- guard is a no-op there. On a from-zero replay risks does not exist yet at
-- this position; the statement is skipped here and re-applied idempotently by
-- 20260817_replay_repair.sql once the table exists.
DO $$
BEGIN
  IF to_regclass('public.risks') IS NOT NULL THEN
    ALTER TABLE risks
      ADD COLUMN IF NOT EXISTS treatment text CHECK (treatment IN ('accept','mitigate','transfer','avoid')),
      ADD COLUMN IF NOT EXISTS risk_appetite text CHECK (risk_appetite IN ('very_low','low','medium','high','very_high')),
      ADD COLUMN IF NOT EXISTS residual_likelihood integer,
      ADD COLUMN IF NOT EXISTS residual_impact integer,
      ADD COLUMN IF NOT EXISTS kri_metric text,
      ADD COLUMN IF NOT EXISTS kri_threshold numeric,
      ADD COLUMN IF NOT EXISTS kri_current_value numeric,
      ADD COLUMN IF NOT EXISTS acceptance_approver_id uuid REFERENCES user_profiles(id),
      ADD COLUMN IF NOT EXISTS acceptance_approved_at timestamptz,
      ADD COLUMN IF NOT EXISTS acceptance_rationale text,
      ADD COLUMN IF NOT EXISTS review_date date,
      ADD COLUMN IF NOT EXISTS next_review_date date,
      ADD COLUMN IF NOT EXISTS linked_framework_ids uuid[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS linked_control_ids uuid[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS linked_asset_ids uuid[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS linked_incident_ids uuid[] DEFAULT '{}';
  END IF;
END $$;
