-- Add org/tenant-scoped RLS policies to LIVE (snake_case) tables that had RLS
-- enabled but NO policy (Supabase advisor: rls_enabled_no_policy). Without a
-- policy these tables denied all access to anon/authenticated, which is one of
-- the reasons the dashboard fell back to seed data.
--
-- Matches the established convention on sibling tables (models/policies/risks):
--   org_id (uuid)     -> org_id = current_user_org_id()
--   tenant_id (text)  -> tenant_id = (current_user_org_id())::text
--   user_id (text)    -> user_id = (auth.uid())::text   (owner-scoped)
--
-- Legacy PascalCase duplicate tables and child/reference tables are intentionally
-- NOT covered here — see docs/db/schema_consolidation_plan.sql.
-- Applied via Supabase MCP on 2026-08-13 (project vhparvughsygyknblkzt).
DO $$
DECLARE
  t text;
  tenant_tables text[] := ARRAY[
    'audits','compliance_calendar','compliance_events','compliance_scores',
    'conformity_assessments','dashboard_snapshots','data_assets','documents',
    'exceptions','maturity_assessments','rbac_roles','rbac_users',
    'red_team_campaigns','regulation_entries','remediation_items',
    'report_schedules','security_scans','security_threats',
    'security_vulnerabilities','vendor_questionnaire','workflow_instances',
    'workflow_templates'
  ];
  org_tables text[] := ARRAY['dsar_requests'];
BEGIN
  -- Replay-safety: several of these tables exist only on the live database
  -- (created out-of-band; see supabase/migrations/README.md). Skip the ones a
  -- from-zero replay does not have instead of failing the whole reset.
  FOREACH t IN ARRAY tenant_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    -- Replay-safety: this file encodes the CURRENT scoping model; earlier
    -- April-era unify loops may have stripped tenant_id on a fresh replay.
    -- Heal the column so the policy below always applies (no-op live).
    EXECUTE format($h$ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default'$h$, t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_org', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      || 'USING (tenant_id::text = (current_user_org_id())::text) '
      || 'WITH CHECK (tenant_id::text = (current_user_org_id())::text)',
      t || '_org', t);
  END LOOP;

  FOREACH t IN ARRAY org_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS org_id uuid', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_org', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      || 'USING (org_id = current_user_org_id()) '
      || 'WITH CHECK (org_id = current_user_org_id())',
      t || '_org', t);
  END LOOP;

  IF to_regclass('public.training_assignments') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS training_assignments_owner ON public.training_assignments';
    EXECUTE 'CREATE POLICY training_assignments_owner ON public.training_assignments '
         || 'FOR ALL TO authenticated USING (user_id::text = (auth.uid())::text) WITH CHECK (user_id::text = (auth.uid())::text)';
  END IF;
END $$;
