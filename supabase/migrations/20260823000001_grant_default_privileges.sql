-- ---------------------------------------------------------------------------
-- TD-010 — close the table-privilege gap for tables created after the one-time
-- GRANT sweep.
--
-- WHY. `20260420160001_functional_integration.sql:303` runs
--   grant select, insert, update, delete on all tables in schema public to authenticated;
-- exactly ONCE. It cannot reach a table created by any later migration, and the
-- repo has never committed a matching ALTER DEFAULT PRIVILEGES — note that
-- `20260813000006_close_anon_rls.sql:34` DOES use default privileges, but only
-- to *revoke* SELECT from `anon`. So every table added since inherits the
-- revoke and never receives the grant.
--
-- Hosted Supabase papers over this: its bootstrap sets
--   ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO
--     postgres, anon, authenticated, service_role;
-- so the gap is invisible in production. It is NOT invisible on a from-zero
-- replay into a bare Postgres — a self-hosted, air-gapped or CI-provisioned
-- database gets `permission denied for table ...` on tables that are otherwise
-- correct. Confirmed unwritable that way (Postgres 16.13): financial_risks,
-- policy_templates, policy_acknowledgments, post_market_plans — all already on
-- main and all believed working.
--
-- Two parts: (1) re-run the sweep so existing gaps close, (2) commit the
-- default-privileges rule so the guarantee lives in version control rather than
-- in a hosting provider's setup.
--
-- SAFETY. Table privileges are coarse; ROW-level access is governed by RLS,
-- which denies by default when no policy matches. Granting UPDATE/DELETE at the
-- table level therefore does NOT weaken append-only tables such as `audit_log`
-- or `evidence_chain`: those are append-only precisely because they carry no
-- UPDATE/DELETE policy, and a missing policy still denies. This mirrors the
-- posture the platform already chose in functional_integration.
--
-- Idempotent; safe to re-run.
-- ---------------------------------------------------------------------------

-- 1. Close the existing gap.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- 2. Make it hold for tables created by future migrations, so a new module does
--    not silently ship unwritable outside hosted Supabase.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;

-- 3. Re-assert the anon revoke from close_anon_rls. Step 1 above grants only to
--    `authenticated` and `service_role`, so it cannot re-open anon — but the
--    revoke is repeated here so the end state is unambiguous to a reader and
--    survives any future blanket grant.
REVOKE SELECT ON ALL TABLES IN SCHEMA public FROM anon;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE SELECT ON TABLES FROM anon;
