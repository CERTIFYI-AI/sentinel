-- Sentinel v1.0 ORGANIZATION modules full wire-up (12 tables)
-- FIX 2026-04-28: corrected get_org_id() to reference user_profiles.id (not user_id),
-- and the canonical risks table is `risks`, not `risk_register`.
-- Idempotent: every step is guarded with IF (NOT) EXISTS so it can be re-run safely.
BEGIN;

CREATE OR REPLACE FUNCTION public.get_org_id()
RETURNS uuid LANGUAGE sql STABLE AS $fn$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.org_id', true), '')::uuid,
    (SELECT org_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  );
$fn$;

DO $$
DECLARE t text;
DECLARE tables text[] := ARRAY[
  'departments','roles','committees','training_courses','bcp_plans',
  'ethics_reports','assets','identities','bia_processes',
  'risks','ai_models','tasks'
];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name=t)
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name='org_id') THEN
      EXECUTE format('CREATE INDEX IF NOT EXISTS %I ON public.%I(org_id)', t||'_org_id_idx', t);
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_tenant_isolation', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (org_id = public.get_org_id()) WITH CHECK (org_id = public.get_org_id())', t||'_tenant_isolation', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_service_role', t);
      EXECUTE format('CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)', t||'_service_role', t);
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
      IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename=t) THEN
        BEGIN
          EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        EXCEPTION WHEN OTHERS THEN
          NULL; -- already added or unsupported, ignore
        END;
      END IF;
    END IF;
  END LOOP;
END $$;

COMMIT;
