-- Fix 8: Task schema extension - FK pickers, watchers, SLA, recurrence
-- Replay-safety guard: tasks and its FK targets are created later in 20260417/20260418 migrations
-- On the live database this migration already ran when tasks existed, so the
-- guard is a no-op there. On a from-zero replay tasks does not exist yet at
-- this position; the statement is skipped here and re-applied idempotently by
-- 20260817_replay_repair.sql once the table exists.
DO $$
BEGIN
  IF to_regclass('public.tasks') IS NOT NULL THEN
    ALTER TABLE tasks
      ADD COLUMN IF NOT EXISTS linked_control_id uuid REFERENCES controls(id),
      ADD COLUMN IF NOT EXISTS linked_framework_id uuid REFERENCES frameworks(id),
      ADD COLUMN IF NOT EXISTS linked_risk_id uuid REFERENCES risks(id),
      ADD COLUMN IF NOT EXISTS linked_incident_id uuid REFERENCES incidents(id),
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
