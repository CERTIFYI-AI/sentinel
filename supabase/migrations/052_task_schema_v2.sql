-- Fix 8: Task schema extension - FK pickers, watchers, SLA, recurrence
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
