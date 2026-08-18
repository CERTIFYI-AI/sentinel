-- 20260830000003_close_ws02_catalog_read_cross_tenant.sql
--
-- WHY: `20260421000014_ws02_tenancy_sweep.sql` classified eleven tables as
-- "tables [that] serve every tenant" and gave each one
--
--     CREATE POLICY ws02_catalog_read ON public.<t>
--       FOR SELECT TO authenticated USING (true);
--
-- Three of the eleven genuinely are global reference data (framework_sections,
-- policy_templates, maturity_dimensions). Eight are not. One of the eight,
-- audit_findings, was caught in 20260821000001 with the note "every tenant
-- could read every other tenant's audit findings". The remaining SEVEN were
-- never revisited, and each holds tenant data:
--
--   document_versions        an org's document version history
--   event_cascade_links      an org's governance cascade graph
--   incident_workflow_steps  an org's incident response steps
--   observability_metrics    an org's model latency, error rate, drift, cost
--   vendor_questionnaires    an org's vendor due-diligence answers
--   workflow_step_actions    an org's workflow actions
--   module_health            an org's module health signals
--
-- All seven ALSO carry a correct org-scoped policy, and that does not help:
-- Postgres OR-combines PERMISSIVE policies, so `USING (true)` widens access
-- straight past the org predicate beside it. This is TD-000 recurring — the
-- entry written to preserve exactly this lesson: "RLS is on" is not an
-- assurance statement, and neither is "an isolation policy exists".
--
-- Reproduced before writing this migration, on a from-zero replay: a user in
-- Org A read Org B's document_versions rows.
--
-- event_cascade_links additionally carried cascade_org_insert
-- (FOR INSERT TO authenticated WITH CHECK (true)), so a client could write a
-- cascade link into another organisation. Replaced with the org predicate
-- rather than dropped, because the INSERT path is used by the governance event
-- bus and must keep working for the caller's own org.
--
-- FIX: drop the two ws02 catalog policies on the seven tables, exactly as
-- 20260821000001 did for audit_findings. The org-scoped read policy and the
-- service_role policy both already exist on every one of them (asserted
-- below), so no access that should exist is removed.
--
-- Idempotent: DROP POLICY IF EXISTS, and a second run finds nothing.
-- Self-verifying: raises if any of the seven would be left without an
-- org-scoped read policy, or if any permissive `true` policy for a non-service
-- role survives on them.

-- ── 1. Remove the over-broad catalogue policies ─────────────────────────────
DO $$
DECLARE
  t text;
  dropped int := 0;
  n int;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'document_versions', 'event_cascade_links', 'incident_workflow_steps',
    'observability_metrics', 'vendor_questionnaires', 'workflow_step_actions',
    'module_health'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE '% absent; skipping', t;
      CONTINUE;
    END IF;

    SELECT count(*) INTO n FROM pg_policies
     WHERE schemaname = 'public' AND tablename = t
       AND policyname IN ('ws02_catalog_read', 'ws02_catalog_svc');
    dropped := dropped + n;

    EXECUTE format('DROP POLICY IF EXISTS ws02_catalog_read ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS ws02_catalog_svc  ON public.%I', t);
  END LOOP;

  RAISE NOTICE 'dropped % cross-tenant catalogue policy/policies', dropped;
END $$;

-- ── 2. Narrow the cross-tenant INSERT on event_cascade_links ────────────────
DO $$
BEGIN
  IF to_regclass('public.event_cascade_links') IS NULL THEN RETURN; END IF;

  DROP POLICY IF EXISTS cascade_org_insert ON public.event_cascade_links;
  CREATE POLICY cascade_org_insert ON public.event_cascade_links
    FOR INSERT TO authenticated
    WITH CHECK (org_id = auth.current_org_id());

  RAISE NOTICE 'event_cascade_links insert is now scoped to the caller''s org';
END $$;

-- ── 3. Verify: nothing lost, nothing left open ──────────────────────────────
DO $$
DECLARE
  t text;
  reads int;
  svc int;
  open_policies text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'document_versions', 'event_cascade_links', 'incident_workflow_steps',
    'observability_metrics', 'vendor_questionnaires', 'workflow_step_actions',
    'module_health'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;

    -- An org-scoped read must remain, or this migration would have taken the
    -- table away from the tenant that legitimately owns its rows.
    SELECT count(*) INTO reads FROM pg_policies
     WHERE schemaname = 'public' AND tablename = t
       AND cmd IN ('SELECT', 'ALL')
       AND coalesce(qual, '') ~* '(org_id|tenant_id)';
    IF reads = 0 THEN
      RAISE EXCEPTION
        '% would be left with no org-scoped read policy — refusing to lock a '
        'tenant out of its own rows', t;
    END IF;

    -- Service role must still be able to write (worker, edge functions).
    SELECT count(*) INTO svc FROM pg_policies
     WHERE schemaname = 'public' AND tablename = t
       AND roles::text[] && ARRAY['service_role'];
    IF svc = 0 THEN
      RAISE EXCEPTION '% has no service_role policy left', t;
    END IF;
  END LOOP;

  -- The TD-000 regression test, scoped to the tables this migration touched.
  SELECT string_agg(tablename || '.' || policyname, ', ' ORDER BY tablename)
    INTO open_policies
    FROM pg_policies
   WHERE schemaname = 'public'
     AND permissive = 'PERMISSIVE'
     AND tablename = ANY (ARRAY[
       'document_versions', 'event_cascade_links', 'incident_workflow_steps',
       'observability_metrics', 'vendor_questionnaires', 'workflow_step_actions',
       'module_health'])
     AND NOT (roles::text[] && ARRAY['service_role'])
     AND coalesce(qual, '') || coalesce(with_check, '')
         !~* '(org_id|tenant_id|auth\.uid|current_user_org_id|current_org_id)';

  IF open_policies IS NOT NULL THEN
    RAISE EXCEPTION
      'permissive policy without a tenant predicate still present: %',
      open_policies;
  END IF;

  RAISE NOTICE 'all seven tables are org-scoped for authenticated readers';
END $$;
