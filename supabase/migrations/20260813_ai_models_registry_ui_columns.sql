-- Model Registry wiring: make `ai_models` the canonical registry backing table.
-- (1) Add the metric columns the Registry UI displays/edits (previously only
--     present on the legacy, code-unused `models` table).
-- (2) Default org_id to get_org_id() so RLS-scoped inserts by an authenticated
--     user auto-fill the caller's org (matching the `models` table convention),
--     removing the need for client-side org_id plumbing.
-- Additive + safe (table is empty). Applied via Supabase MCP on 2026-08-13.
ALTER TABLE public.ai_models
  ADD COLUMN IF NOT EXISTS fairness_score numeric,
  ADD COLUMN IF NOT EXISTS drift_status text DEFAULT 'stable',
  ADD COLUMN IF NOT EXISTS drift_score numeric;

ALTER TABLE public.ai_models
  ALTER COLUMN org_id SET DEFAULT get_org_id();
