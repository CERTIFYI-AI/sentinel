-- 20260814_guardrail_rules_tenant_default
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-14 via mcp apply_migration.
--
-- Foundation gap: guardrail_rules and incidents are tenant-scoped by RLS
-- (tenant_id = current_user_org_id()::text on every command) but the column
-- default was the literal 'default'. Per platform convention the client never
-- sends the scoping column (the DB fills it, as ai_models does with org_id),
-- so every client insert that correctly omitted tenant_id received 'default'
-- and failed the RLS WITH CHECK. Align the text-keyed tenant defaults with the
-- policies, mirroring the uuid tables' `org_id default current_user_org_id()`.
-- Idempotent: `set default` simply overwrites the previous default.

-- REPLAY NOTE: live guardrail_rules gained columns out-of-band that the
-- trust-runtime seeds use; recreate them for from-zero replays (no-op live).
ALTER TABLE public.guardrail_rules ADD COLUMN IF NOT EXISTS condition jsonb DEFAULT '{}';
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='guardrail_rules' AND column_name='org_id' AND is_nullable='NO') THEN
    ALTER TABLE public.guardrail_rules ALTER COLUMN org_id DROP NOT NULL;
  END IF;
END $$;
ALTER TABLE public.guardrail_rules ADD COLUMN IF NOT EXISTS priority integer DEFAULT 100;

alter table public.guardrail_rules alter column tenant_id set default current_user_org_id()::text;

-- Same gap on incidents; guardrail escalation creates incidents from the
-- client, so the default must satisfy the incidents_org WITH CHECK too.
alter table public.incidents alter column tenant_id set default current_user_org_id()::text;
