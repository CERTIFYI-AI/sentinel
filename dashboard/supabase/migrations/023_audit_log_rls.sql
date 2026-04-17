-- P0: Immutable audit_log (ISO 27001 A.5.33 / A.8.15)
-- Append-only, no update/delete at RLS layer

-- Create audit_log if not exists
CREATE TABLE IF NOT EXISTS audit_log (
  id bigserial PRIMARY KEY,
  tenant_id uuid NOT NULL,
  actor_id uuid NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN ('create','update','soft_delete','restore','read_sensitive')),
  before jsonb,
  after jsonb,
  at timestamptz NOT NULL DEFAULT now(),
  request_id text,
  ip inet
);

-- Enable RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- Insert-only for authenticated users
CREATE POLICY "audit_insert_only" ON audit_log
  FOR INSERT WITH CHECK (true);

-- Read only for auditors
CREATE POLICY "audit_tenant_read" ON audit_log
  FOR SELECT USING (
    tenant_id = (auth.jwt()->>'tenant_id')::uuid
  );

-- Revoke UPDATE/DELETE from all roles
REVOKE UPDATE, DELETE ON audit_log FROM anon, authenticated;

-- Create index for tenant queries
CREATE INDEX IF NOT EXISTS audit_log_tenant_idx ON audit_log(tenant_id, at DESC);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx ON audit_log(entity_type, entity_id);

-- Add deleted_at to tables that lack it (soft-delete support)
DO $$ 
BEGIN
  -- Add deleted_at to key GRC tables if not present
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='policies' AND column_name='deleted_at') THEN
    ALTER TABLE policies ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='controls' AND column_name='deleted_at') THEN
    ALTER TABLE controls ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risks' AND column_name='deleted_at') THEN
    ALTER TABLE risks ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='deleted_at') THEN
    ALTER TABLE incidents ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='deleted_at') THEN
    ALTER TABLE vendors ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='datasets' AND column_name='deleted_at') THEN
    ALTER TABLE datasets ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='models' AND column_name='deleted_at') THEN
    ALTER TABLE models ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evidence' AND column_name='deleted_at') THEN
    ALTER TABLE evidence ADD COLUMN deleted_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='deleted_at') THEN
    ALTER TABLE tasks ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Create partial indexes for active records (where deleted_at is null)
CREATE INDEX IF NOT EXISTS policies_active_idx ON policies(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS controls_active_idx ON controls(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS risks_active_idx ON risks(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS incidents_active_idx ON incidents(tenant_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS vendors_active_idx ON vendors(tenant_id) WHERE deleted_at IS NULL;
