-- Security audit: enable RLS on unprotected tables and add org scoping.
--
-- WHY: public security audit found these tables had no RLS, allowing any
-- authenticated user to read/write across tenants or escalate privileges.

-- ── rbac_permissions ──────────────────────────────────────────────────────────
-- This is a global role→permission lookup (no per-org data).
-- Lock it down: read-only for authenticated, no writes outside migrations.
ALTER TABLE IF EXISTS public.rbac_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rbac_permissions_read ON public.rbac_permissions;
CREATE POLICY rbac_permissions_read ON public.rbac_permissions
  FOR SELECT TO authenticated USING (true);

-- ── regulatory_source_monitors ────────────────────────────────────────────────
-- Add org_id for tenant isolation.
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regulatory_source_monitors' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.regulatory_source_monitors
      ADD COLUMN org_id UUID REFERENCES organizations(id);
  END IF;
END $$;

ALTER TABLE IF EXISTS public.regulatory_source_monitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS regulatory_source_monitors_org ON public.regulatory_source_monitors;
CREATE POLICY regulatory_source_monitors_org ON public.regulatory_source_monitors
  FOR ALL TO authenticated
  USING (org_id = public.current_user_org_id())
  WITH CHECK (org_id = public.current_user_org_id());

-- ── regulatory_change_events ──────────────────────────────────────────────────
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regulatory_change_events' AND column_name = 'org_id'
  ) THEN
    ALTER TABLE public.regulatory_change_events
      ADD COLUMN org_id UUID REFERENCES organizations(id);
  END IF;
END $$;

ALTER TABLE IF EXISTS public.regulatory_change_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS regulatory_change_events_org ON public.regulatory_change_events;
CREATE POLICY regulatory_change_events_org ON public.regulatory_change_events
  FOR ALL TO authenticated
  USING (org_id = public.current_user_org_id())
  WITH CHECK (org_id = public.current_user_org_id());

-- ── corporate_policies ────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.corporate_policies ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'corporate_policies' AND column_name = 'org_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS corporate_policies_org ON public.corporate_policies';
    EXECUTE 'CREATE POLICY corporate_policies_org ON public.corporate_policies
      FOR ALL TO authenticated
      USING (org_id = public.current_user_org_id())
      WITH CHECK (org_id = public.current_user_org_id())';
  ELSE
    EXECUTE 'DROP POLICY IF EXISTS corporate_policies_read ON public.corporate_policies';
    EXECUTE 'CREATE POLICY corporate_policies_read ON public.corporate_policies
      FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;

-- ── policy_framework_mapping ──────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.policy_framework_mapping ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_framework_mapping_read ON public.policy_framework_mapping;
CREATE POLICY policy_framework_mapping_read ON public.policy_framework_mapping
  FOR SELECT TO authenticated USING (true);

-- ── control_evidence ──────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.control_evidence ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'control_evidence' AND column_name = 'org_id'
  ) THEN
    EXECUTE 'DROP POLICY IF EXISTS control_evidence_org ON public.control_evidence';
    EXECUTE 'CREATE POLICY control_evidence_org ON public.control_evidence
      FOR ALL TO authenticated
      USING (org_id = public.current_user_org_id())
      WITH CHECK (org_id = public.current_user_org_id())';
  ELSE
    EXECUTE 'DROP POLICY IF EXISTS control_evidence_read ON public.control_evidence';
    EXECUTE 'CREATE POLICY control_evidence_read ON public.control_evidence
      FOR SELECT TO authenticated USING (true)';
  END IF;
END $$;
