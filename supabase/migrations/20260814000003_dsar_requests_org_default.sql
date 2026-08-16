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

-- Replay-safety: on the live DB datasets.id is text and this FK exists; on a
-- from-zero replay datasets.id is uuid, so the typed FK cannot be created.
-- Fall back to a plain column there (interlink resolves by id value).
DO $$
BEGIN
  ALTER TABLE public.dsar_requests
    ADD COLUMN IF NOT EXISTS dataset_id text REFERENCES public.datasets(id) ON DELETE SET NULL;
EXCEPTION WHEN datatype_mismatch OR invalid_foreign_key OR undefined_table THEN
  ALTER TABLE public.dsar_requests ADD COLUMN IF NOT EXISTS dataset_id text;
END $$;

CREATE INDEX IF NOT EXISTS idx_dsar_requests_dataset ON public.dsar_requests(dataset_id);
