-- Sentinel Governance Mesh — Fortune 500 hardening pass
--
-- Addresses Supabase advisor findings against the mesh objects:
--   1. rls_policy_always_true on agent_registry + governance_events
--   2. function_search_path_mutable on fn_notify_governance_event + fn_rollup_agent_metrics
--
-- Design:
--   * Replace "USING (true)" policies with org-scoped policies that match
--     auth.jwt()->>'org_id'. Service-role retains unrestricted write access
--     so edge-functions / triggers still operate.
--   * Pin search_path for SECURITY DEFINER-adjacent functions so they are
--     immune to search_path-injection attacks.

BEGIN;

-- --------------------------------------------------------------------
-- 1. agent_registry — drop permissive policy, install org-scoped ones
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS ar_org ON public.agent_registry;

-- Read: any authenticated user can read agents belonging to their org,
-- plus the global catalog (org_id IS NULL).
CREATE POLICY agent_registry_org_read
  ON public.agent_registry
  FOR SELECT
  TO authenticated
  USING (
    org_id IS NULL
    OR org_id::text = COALESCE(auth.jwt() ->> 'org_id', '')
  );

-- Write: only service_role (used by migrations / seeding / dispatcher).
CREATE POLICY agent_registry_service_write
  ON public.agent_registry
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- --------------------------------------------------------------------
-- 2. governance_events — org-scoped read, service-role write
-- --------------------------------------------------------------------
DROP POLICY IF EXISTS events_org ON public.governance_events;

CREATE POLICY governance_events_org_read
  ON public.governance_events
  FOR SELECT
  TO authenticated
  USING (org_id::text = COALESCE(auth.jwt() ->> 'org_id', ''));

-- Authenticated users may enqueue events for their own org (UI emits).
CREATE POLICY governance_events_org_insert
  ON public.governance_events
  FOR INSERT
  TO authenticated
  WITH CHECK (org_id::text = COALESCE(auth.jwt() ->> 'org_id', ''));

-- Service role: full access for the dispatcher / edge functions.
CREATE POLICY governance_events_service_all
  ON public.governance_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- --------------------------------------------------------------------
-- 3. Pin search_path for governance functions
-- --------------------------------------------------------------------
ALTER FUNCTION public.fn_notify_governance_event() SET search_path = public, pg_catalog;
ALTER FUNCTION public.fn_rollup_agent_metrics()    SET search_path = public, pg_catalog;

COMMIT;
