-- ---------------------------------------------------------------------------
-- Framework catalog: global-reference visibility.
--
-- WHY. A compliance framework's control catalog (ISO 27001's 93 Annex A
-- controls, PCI DSS's requirements, …) is PUBLISHED REFERENCE DATA — identical
-- for every tenant. But `frameworks` and `framework_controls` were swept into
-- strict per-tenant RLS (`org_id = auth.current_org_id()`) by the ws01 tenancy
-- pass, and the ten seeded frameworks live at the system org
-- 00000000-…-0000 while every tenant (including the demo org …-0001) reads only
-- its own org. Net effect: a tenant cannot see the frameworks at all, and the
-- freshly-seeded catalog (seeded at the demo org per the seed contract) would
-- be visible to the demo org but detached from frameworks it cannot see. The
-- reference catalog was structurally unreachable.
--
-- The correct model for reference data is a GLOBAL CATALOG + TENANT OVERLAY:
--   * the published catalog lives at the system org 00000000-…-0000 and is
--     readable by every authenticated user;
--   * a tenant's OWN rows (a control it adds, its implementation state) stay
--     private to its org;
--   * per-tenant *implementation* state already lives in the separate,
--     org-scoped `controls` register — this table is the definitions, not the
--     tenant's progress, so global read leaks nothing.
--
-- This migration therefore:
--   1. moves the seeded catalog rows (id LIKE 'fc-%') to the system org, so the
--      catalog is co-located with the frameworks it describes — regardless of
--      which org each seed migration wrote (they used the demo org);
--   2. replaces the SELECT policy on `frameworks` and `framework_controls` with
--      a global-catalog-inclusive predicate: read a row if it is the system
--      catalog OR it belongs to your org. INSERT/UPDATE/DELETE stay strictly
--      org-scoped, so a tenant can add and see its own rows but can never
--      mutate — or leak — another tenant's, nor the shared catalog.
--
-- Runs AFTER the 20260826000010–14 catalog seeds. Idempotent; safe to re-run.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  sys_org constant uuid := '00000000-0000-0000-0000-000000000000';
BEGIN
  -- 1. Co-locate the seeded catalog at the system org. Scope to the catalog's
  --    deterministic ids so a real tenant's own future rows are never moved.
  IF to_regclass('public.framework_controls') IS NOT NULL THEN
    UPDATE public.framework_controls
       SET org_id = sys_org
     WHERE id LIKE 'fc-%'
       AND org_id IS DISTINCT FROM sys_org;
  END IF;
END $$;

-- 2. Global-catalog read policies. Drop the strict per-tenant SELECT policy and
--    re-create it as "system catalog OR your org". Write policies are left
--    untouched (still org-scoped), so tenant isolation on mutation is intact.
DO $$
DECLARE
  sys_org constant text := '00000000-0000-0000-0000-000000000000';
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['frameworks','framework_controls'] LOOP
    CONTINUE WHEN to_regclass('public.'||t) IS NULL;

    -- Remove any prior read policy under either the ws01 name or our own, so
    -- re-runs converge to exactly one SELECT policy.
    EXECUTE format('DROP POLICY IF EXISTS ws01_org_read ON public.%I', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t||'_catalog_read', t);

    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        FOR SELECT TO authenticated
        USING (org_id = %L::uuid OR org_id = auth.current_org_id())
    $f$, t||'_catalog_read', t, sys_org);
  END LOOP;
END $$;

-- 3. Proof (RAISE): catalog rows now at the system org, and the read policy in
--    force. auth.* is stubbed under replay so a live-session count is not
--    meaningful here; this asserts the placement the policy keys on.
DO $$
DECLARE
  sys_org constant uuid := '00000000-0000-0000-0000-000000000000';
  n_catalog bigint;
  n_off bigint;
BEGIN
  SELECT count(*) INTO n_catalog FROM public.framework_controls WHERE org_id = sys_org AND id LIKE 'fc-%';
  SELECT count(*) INTO n_off     FROM public.framework_controls WHERE id LIKE 'fc-%' AND org_id <> sys_org;
  RAISE NOTICE 'framework catalog at system org: % rows (% still off-org)', n_catalog, n_off;
  IF n_off > 0 THEN
    RAISE EXCEPTION 'catalog rows not fully co-located at system org: % remain', n_off;
  END IF;
END $$;
