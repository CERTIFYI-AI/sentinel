-- ---------------------------------------------------------------------------
-- Framework-controls catalog foundation.
--
-- WHY. Every one of the ten seeded frameworks advertises a `control_count`
-- (EU AI Act 113, GDPR 99, NIST AI RMF 58 …) while `framework_controls` — the
-- table meant to hold the actual catalog of each framework's controls — is
-- EMPTY, and no page reads it. The number on the card is metadata with nothing
-- behind it: click a framework and there is no catalog to see. This migration
-- and the seed migrations that follow it populate the real, published catalog
-- for all fifteen frameworks (the ten already present plus SOC 2, ISO/IEC
-- 27001:2022, HIPAA, HITRUST CSF and PCI DSS v4.0), and the Frameworks page is
-- wired to render it, interlinked to the org's own `controls` register.
--
-- This file only prepares the ground; the catalog rows arrive in the
-- 20260826000010+ seed migrations. It:
--   1. gives `framework_controls.org_id` a DB default, so the catalog obeys the
--      platform rule that the scoping column is filled by the database, never
--      the client (First principle #3) — the seeds still set it explicitly, but
--      a future in-app "add control" write no longer has to;
--   2. adds the indexes the catalog view queries by (framework, domain, ref);
--   3. leaves a marker comment describing the deterministic id contract the
--      seed migrations share, so a control row is idempotent across re-runs.
--
-- Idempotent; safe to re-run.
-- ---------------------------------------------------------------------------

-- 1. DB-filled scoping column. current_user_org_id() is the same resolver the
--    canonical tables use; under a migration role it is NULL, which is fine —
--    every seed row sets org_id explicitly to the demo org.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema='public' AND table_name='framework_controls' AND column_name='org_id'
  ) THEN
    BEGIN
      ALTER TABLE public.framework_controls
        ALTER COLUMN org_id SET DEFAULT current_user_org_id();
    EXCEPTION WHEN undefined_function THEN
      -- resolver not yet defined in this replay position; the later repair
      -- migrations re-assert defaults, so skip rather than abort.
      RAISE NOTICE 'current_user_org_id() unavailable here; org_id default deferred';
    END;
  END IF;
END $$;

-- 2. Query paths the catalog view uses: by framework, and by (framework,domain)
--    for the grouped display, and by control_ref for interlink resolution.
CREATE INDEX IF NOT EXISTS idx_fc_framework_org       ON public.framework_controls (framework_id, org_id);
CREATE INDEX IF NOT EXISTS idx_fc_framework_domain    ON public.framework_controls (framework_id, domain);
CREATE INDEX IF NOT EXISTS idx_fc_control_ref         ON public.framework_controls (control_ref);

-- 3. Seed contract (shared by 20260826000010+). Documented on the table so the
--    next author follows the same shape:
--      id          := 'fc-<framework_id>-<slugified control_ref>'  (TEXT PK)
--      org_id      := '00000000-0000-0000-0000-000000000001'       (demo org)
--      framework_id-> frameworks.id (new frameworks insert their row first)
--      control_ref := the REAL published identifier (A.5.1, CC1.1, 1.1.1, …)
--      title/description := the REAL published control text — never invented
--      ON CONFLICT (id) DO UPDATE, so a re-run refreshes title/description.
COMMENT ON TABLE public.framework_controls IS
  'Authoritative per-org catalog of each framework''s published controls. Seeded '
  'from real standards (ISO/SOC 2/PCI/HIPAA/HITRUST + the AI frameworks). id = '
  'fc-<framework_id>-<control_ref slug>; org_id defaults to current_user_org_id(); '
  'the org''s implemented controls in public.controls map to these by control_ref.';
