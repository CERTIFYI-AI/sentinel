-- 20260817_replay_repair.sql
--
-- Companion to 007_replay_baseline.sql. Three early migrations (040, 050,
-- 052) referenced tables that are created later in the lexicographic order,
-- so their statements are now guarded at their original position and
-- re-applied HERE, once every target table exists. Everything below is
-- idempotent: on the live database (where the originals already ran) this
-- file is a complete no-op.

-- 040: regulator_filings.linked_incident_id -> incidents(id)
DO $$
BEGIN
  IF to_regclass('public.regulator_filings') IS NOT NULL
     AND to_regclass('public.incidents') IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM pg_constraint
       WHERE conname = 'regulator_filings_linked_incident_id_fkey'
     ) THEN
    ALTER TABLE regulator_filings
      ADD CONSTRAINT regulator_filings_linked_incident_id_fkey
      FOREIGN KEY (linked_incident_id) REFERENCES incidents(id);
  END IF;
END $$;

-- 050: risk schema v2 extension (skipped on fresh replay: risks created later)
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
      ADD COLUMN IF NOT EXISTS linked_incident_ids text[] DEFAULT '{}';
  END IF;
END $$;

-- 052: task schema v2 extension (skipped on fresh replay: tasks created later)
DO $$
BEGIN
  IF to_regclass('public.tasks') IS NOT NULL
     AND to_regclass('public.controls') IS NOT NULL
     AND to_regclass('public.frameworks') IS NOT NULL
     AND to_regclass('public.risks') IS NOT NULL
     AND to_regclass('public.incidents') IS NOT NULL THEN
    ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS linked_control_id uuid REFERENCES controls(id),
      -- frameworks.id is TEXT (catalog slugs like 'iso-42001')
      ADD COLUMN IF NOT EXISTS linked_framework_id text REFERENCES frameworks(id),
      ADD COLUMN IF NOT EXISTS linked_risk_id text REFERENCES risks(id),
      ADD COLUMN IF NOT EXISTS linked_incident_id text REFERENCES incidents(id),
      ADD COLUMN IF NOT EXISTS watchers uuid[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS labels text[] DEFAULT '{}',
      ADD COLUMN IF NOT EXISTS sla_hours integer,
      ADD COLUMN IF NOT EXISTS sla_breached boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS reminder_at timestamptz,
      ADD COLUMN IF NOT EXISTS is_recurring boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS recurrence_rule jsonb,
      ADD COLUMN IF NOT EXISTS approval_required boolean DEFAULT false,
      ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES user_profiles(id),
      ADD COLUMN IF NOT EXISTS approved_at timestamptz,
      ADD COLUMN IF NOT EXISTS estimated_hours numeric,
      ADD COLUMN IF NOT EXISTS actual_hours numeric,
      ADD COLUMN IF NOT EXISTS completion_notes text;
  END IF;
END $$;

-- 051 is intentionally NOT re-applied: it targets the legacy `models` table,
-- which is not part of the repo schema (superseded by ai_models).
