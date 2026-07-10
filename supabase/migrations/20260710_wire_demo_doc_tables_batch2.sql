-- Demo doc-jsonb tables for seed-fallback dashboard pages (batch 2, 31 CRUD pages).
-- Same uniform aggregate-root shape as batch 1: (id text pk, doc jsonb, updated_at),
-- unwrapped by the useSupabaseTable hook. RLS anon/authenticated open (demo posture).
-- Applied via Supabase MCP on 2026-07-10.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'attacksurface_table','biasauditwizard_table','committeemanagement_table','compliancecontrols_table',
    'conformityassessment_table','datasetregistry_table','evaltechniques_table','evidencehub_table',
    'evidencesyncengine_table','evidencevault_table','explainabilitycenter_table','fallbacklog_table',
    'guardrailactivity_table','hitlreviewcenter_table','keysvault_table','livetracefeed_table',
    'modelinventory_table','modelriskcommittee_table','policyfirewall_table','promptregistry_table',
    'qualitymetrics_table','redteamlab_table','regradar_table','reportgenerator_table','reporting_table',
    'tasks_table','trustconfig_table','trustenginedashboard_table','usecase_table','vendorassessments_table',
    'vendorsla_table'
  ]
  LOOP
    EXECUTE format('CREATE TABLE IF NOT EXISTS public.%I (id text PRIMARY KEY, doc jsonb NOT NULL DEFAULT ''{}''::jsonb, updated_at timestamptz DEFAULT now())', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_anon_all', t);
    EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO anon, authenticated USING (true) WITH CHECK (true)', t || '_anon_all', t);
  END LOOP;
END $$;
