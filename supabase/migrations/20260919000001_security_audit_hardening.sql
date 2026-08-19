-- Security audit hardening: api_keys constraints, tenant_id defaults,
-- webhook_deliveries RLS WITH CHECK, control_evaluation_history fix.
-- Why: findings H-7 (api_keys nullable hash), H-8 (tenant_id defaults to
-- literal 'default'), M-13 (webhook_deliveries RLS missing WITH CHECK).

BEGIN;

-- H-7: api_keys.key_hash must be NOT NULL and UNIQUE to prevent
-- rows without a hash (which would bypass auth) and duplicate hashes
-- (which would cause ambiguous lookups).
ALTER TABLE IF EXISTS api_keys
  ALTER COLUMN key_hash SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE tablename = 'api_keys' AND indexdef LIKE '%key_hash%UNIQUE%'
  ) AND NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'api_keys'::regclass AND contype = 'u'
      AND pg_get_constraintdef(oid) LIKE '%key_hash%'
  ) THEN
    ALTER TABLE api_keys ADD CONSTRAINT api_keys_key_hash_unique UNIQUE (key_hash);
  END IF;
END $$;

-- H-8: control_evaluation_history.tenant_id should default to the
-- current user's org, not the literal string 'default'.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'control_evaluation_history'
      AND column_name = 'tenant_id'
      AND column_default = '''default''::text'
  ) THEN
    ALTER TABLE control_evaluation_history
      ALTER COLUMN tenant_id SET DEFAULT current_user_org_id();
  END IF;
END $$;

-- M-13: webhook_deliveries — add WITH CHECK to existing RLS policies
-- so inserts/updates are also scoped to the caller's org.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'webhook_deliveries') THEN
    ALTER TABLE webhook_deliveries ENABLE ROW LEVEL SECURITY;
    ALTER TABLE webhook_deliveries FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS webhook_deliveries_org_isolation ON webhook_deliveries;
    CREATE POLICY webhook_deliveries_org_isolation ON webhook_deliveries
      USING (org_id = current_user_org_id())
      WITH CHECK (org_id = current_user_org_id());
  END IF;
END $$;

-- Fix any other tables that default tenant_id to 'default' literal.
-- These should use current_user_org_id() instead.
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT table_name, column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND column_name IN ('tenant_id', 'org_id')
      AND column_default = '''default''::text'
  LOOP
    EXECUTE format(
      'ALTER TABLE %I ALTER COLUMN %I SET DEFAULT current_user_org_id()',
      rec.table_name, rec.column_name
    );
  END LOOP;
END $$;

COMMIT;
