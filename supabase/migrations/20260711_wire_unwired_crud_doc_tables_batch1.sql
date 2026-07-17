-- Doc-jsonb tables for the previously-unwired CRUD pages (batch 1).
-- Same uniform aggregate-root shape as the earlier demo tables:
--   (id text pk, doc jsonb, updated_at). useSupabaseTable unwraps `doc` so the
-- UI-shaped record round-trips, seeds the table on first empty load, and
-- diff-persists every add/edit/delete. RLS is anon/authenticated open (demo).
-- Applied via Supabase MCP on 2026-07-11; anon read verified for all six.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'approvalworkflows_table','automationstudio_table','datalineage_table',
    'financialrisk_table','integrations_table','incidentlog_table'
  ]
  LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I (id text PRIMARY KEY, doc jsonb NOT NULL DEFAULT ''{}''::jsonb, updated_at timestamptz DEFAULT now())', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_anon_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t || '_anon_all', t);
  END LOOP;
END $$;
