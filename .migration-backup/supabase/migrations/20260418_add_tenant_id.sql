-- ============================================================
-- Add tenant_id column to existing tables that are missing it
-- Run this after 20260418_core_grc_tables.sql if tables were
-- created with an older schema
-- ============================================================

DO $$ 
BEGIN
  -- policies
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='policies' AND column_name='tenant_id') THEN
    ALTER TABLE policies ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
    CREATE INDEX IF NOT EXISTS idx_policies_tenant ON policies(tenant_id);
  END IF;
  
  -- risks
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risks' AND column_name='tenant_id') THEN
    ALTER TABLE risks ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
    CREATE INDEX IF NOT EXISTS idx_risks_tenant ON risks(tenant_id);
  END IF;
  
  -- incidents
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='tenant_id') THEN
    ALTER TABLE incidents ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
    CREATE INDEX IF NOT EXISTS idx_incidents_tenant ON incidents(tenant_id);
  END IF;
  
  -- controls
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='controls' AND column_name='tenant_id') THEN
    ALTER TABLE controls ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
    CREATE INDEX IF NOT EXISTS idx_controls_tenant ON controls(tenant_id);
  END IF;
  
  -- vendors
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='tenant_id') THEN
    ALTER TABLE vendors ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
    CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);
  END IF;
  
  -- evidence
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evidence' AND column_name='tenant_id') THEN
    ALTER TABLE evidence ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
  END IF;
  
  -- agents
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='tenant_id') THEN
    ALTER TABLE agents ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
  END IF;
  
  -- hitl_reviews
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hitl_reviews' AND column_name='tenant_id') THEN
    ALTER TABLE hitl_reviews ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
  END IF;
  
  -- model_inventory
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='model_inventory' AND column_name='tenant_id') THEN
    ALTER TABLE model_inventory ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
  END IF;
END $$;

-- Create audit_logs table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id TEXT NOT NULL DEFAULT 'default',
  actor TEXT,
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  old_value JSONB,
  new_value JSONB,
  ip_address TEXT,
  user_agent TEXT,
  timestamp TIMESTAMPTZ DEFAULT now(),
  metadata JSONB DEFAULT '{}'
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_ts ON audit_logs(timestamp DESC);
