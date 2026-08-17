-- ---------------------------------------------------------------------------
-- Post-rollout re-audit — critical fixes.
--
-- Four adversarial re-audits of the twelve modules merged in PR #75 found that
-- the rebuild repaired the PAGES and left three classes of defect behind. The
-- three fixed here are the ones that are actively unsafe or actively broken.
--
--   1. CROSS-TENANT READ VIA VIEWS (regression introduced by PR #75).
--      `vendor_sla_status` and `supply_chain_attestation_status` were created
--      WITHOUT `security_invoker`, so they execute as their OWNER and RLS on the
--      underlying table is never evaluated. Both services read EXCLUSIVELY
--      through these views (vendorSlaService.fetchVendorSlas,
--      attestationService.fetchAttestations), so the SLA and attestation list
--      pages were the leak vector: any authenticated user could read every
--      org's SLA targets, breach history, service credits and contract clauses.
--      The repo already had the right pattern in 20260421000012 — it simply was
--      not applied. Note the RLS verifier cannot catch this: it filters
--      relkind='r', so views are invisible to it.
--
--   2. THE DEMO-TABLE CONTAINMENT NEVER APPLIED TO A NON-EMPTY DATABASE.
--      20260822000002 §9 added `org_id uuid NOT NULL DEFAULT
--      current_user_org_id()` to every `%_table`. Under a migration role
--      auth.uid() is NULL, so the default evaluates to NULL; adding a NOT NULL
--      column with a NULL default to a table WITH ROWS aborts with "column
--      contains null values". A from-zero replay has no rows, so CI passed and
--      the technical-debt register was marked Closed — but the demo tables are
--      populated AT RUNTIME by the demo hook, so on the live database the ALTER
--      failed and the permissive policies survived. The register entry is
--      corrected in the same change; containment is re-applied here in a form
--      that works on a populated table.
--
--   3. PROVENANCE NODES COULD NOT BE CREATED.
--      provenance_nodes.use_case_id was declared uuid, but use_cases.id is TEXT
--      ('UC-CREDIT-001'). The page's use-case picker writes those codes, so
--      every insert failed with `invalid input syntax for type uuid`. Same
--      mismatch on dataset_id (datasets.id is TEXT).
--
-- Idempotent; safe to re-run.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. Views must evaluate the caller's RLS, not the owner's.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.vendor_sla_status
WITH (security_invoker = true) AS
SELECT s.*,
       CASE
         WHEN s.current_value IS NULL OR s.target_value IS NULL THEN 'unmeasured'
         WHEN s.higher_is_better AND s.current_value < COALESCE(s.breach_value, s.target_value) THEN 'breached'
         WHEN NOT s.higher_is_better AND s.current_value > COALESCE(s.breach_value, s.target_value) THEN 'breached'
         WHEN s.higher_is_better AND s.current_value < s.target_value THEN 'at_risk'
         WHEN NOT s.higher_is_better AND s.current_value > s.target_value THEN 'at_risk'
         ELSE 'healthy'
       END AS derived_status
FROM public.vendor_slas s;

CREATE OR REPLACE VIEW public.supply_chain_attestation_status
WITH (security_invoker = true) AS
SELECT a.*,
       CASE
         WHEN a.revoked_at IS NOT NULL THEN 'revoked'
         WHEN a.valid_until IS NULL THEN 'unknown'
         WHEN a.valid_until < CURRENT_DATE THEN 'expired'
         WHEN a.valid_until < CURRENT_DATE + 30 THEN 'expiring_soon'
         ELSE 'valid'
       END AS derived_validity
FROM public.supply_chain_attestations a;

GRANT SELECT ON public.vendor_sla_status TO authenticated;
GRANT SELECT ON public.supply_chain_attestation_status TO authenticated;

-- ---------------------------------------------------------------------------
-- 2. Demo-table containment that survives a populated table.
--    Add the column NULLABLE, backfill, then constrain. Each table is wrapped
--    individually so one failure cannot abort the sweep and leave the rest
--    permissive — the failure mode that made the previous attempt silent.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  fallback_org uuid;
  n_null bigint;
BEGIN
  -- Prefer a real org so backfilled rows land somewhere addressable; fall back
  -- to the demo tenant only when the instance has exactly one org.
  SELECT id INTO fallback_org FROM public.organizations ORDER BY created_at LIMIT 1;

  FOR t IN
    SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind = 'r' AND c.relname LIKE '%\_table'
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS org_id uuid', t);

      -- Backfill only where we have somewhere to put them. Rows we cannot
      -- attribute are left NULL and therefore invisible under the org policy —
      -- deliberately: an unattributable demo row must not leak into a tenant.
      IF fallback_org IS NOT NULL THEN
        EXECUTE format('UPDATE public.%I SET org_id = %L WHERE org_id IS NULL', t, fallback_org);
      END IF;

      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET DEFAULT current_user_org_id()', t);

      EXECUTE format('SELECT count(*) FROM public.%I WHERE org_id IS NULL', t) INTO n_null;
      IF n_null = 0 THEN
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET NOT NULL', t);
      ELSE
        RAISE WARNING 'demo table %: % row(s) could not be attributed to an org; left nullable and excluded by RLS', t, n_null;
      END IF;

      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_anon_all', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_authenticated_all', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_org_all', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
        || 'USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id())',
        t || '_org_all', t);
    EXCEPTION WHEN OTHERS THEN
      -- Never let one demo table abort the sweep; surface it loudly instead.
      RAISE WARNING 'demo table % containment FAILED: %', t, SQLERRM;
    END;
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Provenance node foreign keys must match the id-space they point at.
--    use_cases.id and datasets.id are both TEXT.
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'provenance_nodes'
               AND column_name = 'use_case_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.provenance_nodes ALTER COLUMN use_case_id TYPE text USING use_case_id::text;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema = 'public' AND table_name = 'provenance_nodes'
               AND column_name = 'dataset_id' AND data_type = 'uuid') THEN
    ALTER TABLE public.provenance_nodes ALTER COLUMN dataset_id TYPE text USING dataset_id::text;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. vendors.risk_flag: the agent writes a text label ('CONCENTRATION_BREACH')
--    into what PR #75 created as boolean, so the whole update was rejected with
--    22P02 and concentration_risk / last_assessed_at were lost with it. The
--    agent is corrected in the same change; the column keeps a boolean meaning
--    but gains a companion for the reason, so no information is discarded.
-- ---------------------------------------------------------------------------
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS risk_flag_reason text;
