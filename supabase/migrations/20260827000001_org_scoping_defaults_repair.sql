-- 20260827000001_org_scoping_defaults_repair.sql
--
-- WHY: four service write paths sent `tenant_id` to tables that have no such
-- column. PostgREST rejects the whole row when an unknown column is supplied,
-- so every create/edit on Business Continuity, Departments, Red Team Findings
-- and Training Courses failed at the API boundary:
--
--     bcp_plans          org_id, no tenant_id
--     departments        org_id, no tenant_id
--     red_team_findings  org_id, no tenant_id
--     training_courses   org_id, no tenant_id
--
-- The services are fixed to stop sending the column (CLAUDE.md First principle
-- #3: never let the client fill the scoping column). For that to work the DB
-- must fill `org_id` itself, and `departments.org_id` is NOT NULL with **no
-- default** — dropping the client value there would swap one write failure for
-- a NOT NULL violation. This migration supplies the missing defaults.
--
-- Idempotent: setting a default that already matches is a no-op, and every
-- statement is guarded on the table existing, so this replays cleanly from zero
-- and is a no-op on the live database where some defaults are already in place.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['departments', 'bcp_plans', 'red_team_findings', 'training_courses'] LOOP
    CONTINUE WHEN to_regclass('public.' || t) IS NULL;

    -- Only touch tables that actually carry org_id; never invent the column.
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = t AND column_name = 'org_id'
    );

    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN org_id SET DEFAULT current_user_org_id()', t
    );
  END LOOP;
END $$;

-- Proof: every one of these tables now fills org_id server-side, so a client
-- that omits the column (as the fixed services do) still writes a correctly
-- scoped row. Fails loudly rather than leaving a silent gap.
DO $$
DECLARE
  missing text[];
BEGIN
  SELECT array_agg(t) INTO missing
    FROM unnest(ARRAY['departments', 'bcp_plans', 'red_team_findings', 'training_courses']) AS t
   WHERE to_regclass('public.' || t) IS NOT NULL
     AND NOT EXISTS (
       SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = t
          AND column_name = 'org_id'
          AND column_default IS NOT NULL
     );

  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'org_id still has no DB default on: %', array_to_string(missing, ', ');
  END IF;

  RAISE NOTICE 'org scoping defaults verified on all four repaired tables';
END $$;
