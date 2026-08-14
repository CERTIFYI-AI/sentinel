-- =============================================================================
-- DSAR requests — AI Assets audit follow-up (finding F-6).
-- dsar_requests has org RLS (org_id = current_user_org_id()) but no DB default,
-- so client inserts without org_id were rejected. Let the DB fill the scoping
-- column, per the ai_models discipline, and interlink DSARs to the governed
-- dataset they concern (datasets.id).
-- Idempotent; safe to re-run.
-- =============================================================================

ALTER TABLE public.dsar_requests
  ALTER COLUMN org_id SET DEFAULT current_user_org_id();

ALTER TABLE public.dsar_requests
  ADD COLUMN IF NOT EXISTS dataset_id text REFERENCES public.datasets(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_dsar_requests_dataset ON public.dsar_requests(dataset_id);
