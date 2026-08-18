-- ---------------------------------------------------------------------------
-- 20260831000001_org_id_defaults_create_path_repair.sql
--
-- F2 from the platform audit (2026-08-18), reconciled against the LIVE schema.
--
-- The audit named 13 tables whose create path is rejected because `org_id` has
-- no DB default and the client does not send it, so the table's own INSERT
-- policy (org_id = the caller's org) refuses the row. Verified against the live
-- project: only FIVE of the thirteen carry an `org_id` column at all — the
-- other eight are `tenant_id`-scoped, the same era split recorded as TD-017, so
-- the audit's replay-schema list does not map one-to-one onto live. Of the
-- five, `trust_policies` already defaults (`get_org_id()`); the remaining four
-- have no default and three of them are NOT NULL, so an insert that omits
-- `org_id` fails outright regardless of RLS.
--
-- Fill `org_id` server-side (CLAUDE.md First principle #3: never leave the
-- scoping column to the client) so the create path works without the client
-- supplying it — the pattern `ai_models` already follows.
--
-- Guarded on column existence, so it is a safe no-op wherever the column is
-- absent (a from-zero replay's schema differs from live) and idempotent on
-- re-run. Applied live 2026-08-18; an authenticated-tenant insert then passes
-- the RLS/org_id gate.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t text;
  targets constant text[] := array['api_keys','eval_techniques','model_dna','model_lifecycle_stages'];
BEGIN
  FOREACH t IN ARRAY targets LOOP
    CONTINUE WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema='public' AND table_name=t AND column_name='org_id'
    );
    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET DEFAULT current_user_org_id()', t);
    RAISE NOTICE 'org_id default set on %', t;
  END LOOP;
END $$;

-- NOTE: the other create-path tables the audit named (use_cases, datasets,
-- ai_impact_assessments, guardrail_rules, prompt_registry, webhook_endpoints,
-- consent_records, maturity_assessments) have NO org_id column on the live
-- database — they are tenant_id-scoped. Their create paths must be reconciled
-- as part of the tenant_id/org_id convergence (TD-017), not by an org_id
-- default that would have nothing to attach to.
