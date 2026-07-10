-- Demo doc-jsonb tables for seed-fallback dashboard pages (batch 1).
-- Uniform aggregate-root shape: (id text pk, doc jsonb, updated_at). The
-- dashboard's useSupabaseTable hook unwraps `doc` so the exact UI-shaped
-- record round-trips. RLS is anon/authenticated open (demo posture).
-- Applied via Supabase MCP on 2026-07-10.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'airisktiering_table','assetmanagement_table','bia_table','dataquality_table',
    'dpia_table','iga_table','regulatorfilings_table','ropa_table',
    'tabletopexercises_table','tia_table','transparencyreports_table'
  ]
  LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I (id text PRIMARY KEY, doc jsonb NOT NULL DEFAULT ''{}''::jsonb, updated_at timestamptz DEFAULT now())', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_anon_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t || '_anon_all', t);
  END LOOP;
END $$;
