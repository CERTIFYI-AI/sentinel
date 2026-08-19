-- H-6: integration_connections.credentials is plaintext JSONB.
-- Add credentials_encrypted column (AES-256-GCM blob written by the Python
-- backend, same pattern as integrations.credentials_encrypted).  The plaintext
-- column is kept temporarily so existing rows still work during migration; a
-- follow-up data-migration script encrypts existing values and NULLs the
-- plaintext column.  New writes MUST use credentials_encrypted exclusively.

BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'integration_connections'
      AND column_name = 'credentials_encrypted'
  ) THEN
    ALTER TABLE integration_connections
      ADD COLUMN credentials_encrypted JSONB;
    COMMENT ON COLUMN integration_connections.credentials_encrypted IS
      'AES-256-GCM encrypted credential blob {"v":1,"nonce":"…","ciphertext":"…"}. '
      'Written by the Python backend; the browser never sees plaintext.';
  END IF;
END $$;

-- RLS hardening: ensure integration_connections has RLS with USING + WITH CHECK.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'integration_connections') THEN
    ALTER TABLE integration_connections ENABLE ROW LEVEL SECURITY;
    ALTER TABLE integration_connections FORCE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS integration_connections_org_isolation ON integration_connections;
    CREATE POLICY integration_connections_org_isolation ON integration_connections
      USING (org_id = current_user_org_id())
      WITH CHECK (org_id = current_user_org_id());
  END IF;
END $$;

COMMIT;
