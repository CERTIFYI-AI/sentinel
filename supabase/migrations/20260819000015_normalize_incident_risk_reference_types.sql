-- ---------------------------------------------------------------------------
-- 20260819000001a_normalize_incident_risk_reference_types.sql
--
-- One id-space, enforced by type (CLAUDE.md First principle #2).
--
-- `incidents.id`, `risks.id` and `vendors.id` are TEXT — in this repo
-- (20260418000002_core_grc_tables) and on the live project (verified
-- 2026-08-18). Several child tables nevertheless declare their reference to
-- those parents as `uuid`. Postgres has no implicit uuid↔text equality, so
-- every comparison, join, insert or foreign key across that boundary fails:
--
--   operator does not exist: text = uuid
--   column "incident_id" is of type uuid but expression is of type text
--   foreign key constraint "…_fkey" cannot be implemented
--
-- That is the root cause behind the from-zero replay halting at migration 97 of
-- 148 (platform audit 2026-08-18, F1). Because `supabase db push` aborts on the
-- first failure, the 50 migrations after it never ran at all — so the repo could
-- not build its own database, while the static replay checker reported clean
-- (it verifies references, never types).
--
-- This migration normalises the child columns to `text` so they match their
-- parents. It runs before the seeds that write them. Choosing text (rather than
-- converting the parents to uuid) follows TD-014: the text keys are entrenched
-- in live data and in the business codes those tables carry.
--
-- Guarded per column and idempotent: a column already text is skipped, an
-- absent table or column is skipped. No FK can exist across the mismatch today
-- (Postgres would have refused to create it), so no constraint has to be
-- dropped first.
-- ---------------------------------------------------------------------------

DO $normalize$
DECLARE
  r record;
  targets constant text[][] := ARRAY[
    ['audit_findings',     'linked_risk_id'],
    ['evidence',           'linked_incident_id'],
    ['evidence_artifacts', 'linked_risk_id'],
    ['exceptions',         'linked_risk_id'],
    ['financial_risks',    'linked_risk_id'],
    ['remediation_plans',  'incident_id'],
    ['remediation_plans',  'risk_id'],
    ['incident_workflow_steps', 'incident_id'],
    ['regulator_filings',  'linked_incident_id'],
    ['post_market_events', 'incident_id']
  ];
  pair text[];
  n int := 0;
BEGIN
  FOREACH pair SLICE 1 IN ARRAY targets LOOP
    CONTINUE WHEN to_regclass('public.' || pair[1]) IS NULL;

    SELECT c.data_type INTO r
      FROM information_schema.columns c
     WHERE c.table_schema = 'public'
       AND c.table_name   = pair[1]
       AND c.column_name  = pair[2];
    CONTINUE WHEN NOT FOUND;
    CONTINUE WHEN r.data_type <> 'uuid';

    -- uuid -> text is always safe: every uuid has a canonical text form.
    EXECUTE format(
      'ALTER TABLE public.%I ALTER COLUMN %I TYPE text USING %I::text',
      pair[1], pair[2], pair[2]);
    n := n + 1;
    RAISE NOTICE 'normalised %.% to text (was uuid)', pair[1], pair[2];
  END LOOP;

  RAISE NOTICE 'incident/risk reference types normalised: % column(s)', n;
END $normalize$;

-- Proof: no column that references a text-keyed parent may still be uuid.
DO $proof$
DECLARE
  offenders text;
BEGIN
  SELECT string_agg(c.table_name || '.' || c.column_name, ', ')
    INTO offenders
    FROM information_schema.columns c
    JOIN information_schema.tables t
      ON t.table_schema = c.table_schema
     AND t.table_name   = c.table_name
     AND t.table_type   = 'BASE TABLE'
   WHERE c.table_schema = 'public'
     AND c.data_type    = 'uuid'
     AND c.column_name IN ('incident_id', 'risk_id', 'linked_risk_id', 'linked_incident_id');

  IF offenders IS NOT NULL THEN
    RAISE EXCEPTION 'columns still uuid against a text-keyed parent: %', offenders;
  END IF;

  RAISE NOTICE 'verified: every incident/risk reference column is text';
END $proof$;
