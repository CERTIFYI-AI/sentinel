-- 20260430000001_replay_tenant_reheal.sql
--
-- Replay-safety shim between the April-era org-unify loops (which DROP
-- tenant_id) and the 202607xx+ canonical era (which scopes these tables by
-- tenant_id again — on the live database the column was re-added out-of-band
-- as modules were consolidated). Re-add it for every table the canonical
-- migrations reference with tenant_id. ADD COLUMN IF NOT EXISTS: a complete
-- no-op on the live database. See supabase/migrations/README.md.

ALTER TABLE IF EXISTS public.agent_gov_credentials ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.agent_gov_registry ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.ai_impact_assessments ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.bias_audits ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.conformity_assessments ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.data_quality_assessments ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.dataset_catalog_entries ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.datasets ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.evidence ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.explainability_profiles ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.guardrail_rules ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.incidents ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.metric_profiles ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.prompt_registry ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.public ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.regulation_entries ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.risks ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.scenario_campaigns ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.scenario_templates ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.session_traces ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.tasks ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.use_cases ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.validation_runs ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
ALTER TABLE IF EXISTS public.webhook_endpoints ADD COLUMN IF NOT EXISTS tenant_id text NOT NULL DEFAULT 'default';
