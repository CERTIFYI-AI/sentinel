-- REPLAY NOTE (2026-08-16): guards now also require the TABLE to exist —
-- the column-only checks passed vacuously on a from-zero replay (this file
-- sorts before 20260418000002_core_grc_tables.sql, which creates these
-- tables WITH tenant_id already in place). No-op on the live database.
-- ============================================================
-- Add tenant_id column to existing tables that are missing it
-- Run this after 20260418000002_core_grc_tables.sql if tables were
-- created with an older schema
-- ============================================================

DO $$ 
BEGIN
  -- policies
  IF to_regclass('public.policies') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='policies' AND column_name='tenant_id') THEN
    ALTER TABLE policies ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
    CREATE INDEX IF NOT EXISTS idx_policies_tenant ON policies(tenant_id);
  END IF;
  
  -- risks
  IF to_regclass('public.risks') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='risks' AND column_name='tenant_id') THEN
    ALTER TABLE risks ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
    CREATE INDEX IF NOT EXISTS idx_risks_tenant ON risks(tenant_id);
  END IF;
  
  -- incidents
  IF to_regclass('public.incidents') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='incidents' AND column_name='tenant_id') THEN
    ALTER TABLE incidents ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
    CREATE INDEX IF NOT EXISTS idx_incidents_tenant ON incidents(tenant_id);
  END IF;
  
  -- controls
  IF to_regclass('public.controls') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='controls' AND column_name='tenant_id') THEN
    ALTER TABLE controls ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
    CREATE INDEX IF NOT EXISTS idx_controls_tenant ON controls(tenant_id);
  END IF;
  
  -- vendors
  IF to_regclass('public.vendors') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='vendors' AND column_name='tenant_id') THEN
    ALTER TABLE vendors ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
    CREATE INDEX IF NOT EXISTS idx_vendors_tenant ON vendors(tenant_id);
  END IF;
  
  -- evidence
  IF to_regclass('public.evidence') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='evidence' AND column_name='tenant_id') THEN
    ALTER TABLE evidence ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
  END IF;
  
  -- agents
  IF to_regclass('public.agents') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agents' AND column_name='tenant_id') THEN
    ALTER TABLE agents ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
  END IF;
  
  -- hitl_reviews
  IF to_regclass('public.hitl_reviews') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='hitl_reviews' AND column_name='tenant_id') THEN
    ALTER TABLE hitl_reviews ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
  END IF;
  
  -- model_inventory
  IF to_regclass('public.model_inventory') IS NOT NULL AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='model_inventory' AND column_name='tenant_id') THEN
    ALTER TABLE model_inventory ADD COLUMN tenant_id TEXT NOT NULL DEFAULT 'default';
  END IF;
END $$;

-- REPLAY NOTE: the audit_logs stub that lived here (columns actor/timestamp)
-- conflicted with the canonical audit_logs created one file later in
-- 20260418000002_core_grc_tables.sql (actor_id/created_at) — on a from-zero
-- replay the stub won the IF NOT EXISTS race and the canonical file's index
-- on created_at then failed. On the live DB the canonical table always
-- existed first, so removing the stub changes nothing there.
