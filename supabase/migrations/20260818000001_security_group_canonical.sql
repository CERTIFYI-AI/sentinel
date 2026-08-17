-- 20260818000001_security_group_canonical.sql
--
-- SECURITY group (Threats & Scans · Red Teaming · Defense & Policies) onto the
-- platform contract (CLAUDE.md): real org-scoped tables with RLS, one model
-- id-space (ai_models.id uuid), no anon-writable demo tables behind
-- security-critical screens.
--
-- Audit findings this closes (2026-08-16 security-group audit):
--   * pages wired to anon-open doc-jsonb demo tables (attacksurface_table,
--     policyfirewall_table, keysvault_table, reportgenerator_table,
--     redteamlab_table, redteamfindings_table) — anon policies dropped here
--   * red_team_findings had no real columns and no RLS policy
--   * model_arena_runs / policy_firewall_rules / keys_vault /
--     attack_surface_assets were generic macro shells with no module fields
--   * JIT page targeted a nonexistent jit_elevation_requests table — the
--     real table is jit_elevations (ws04); no schema change needed there
--   * no security_reports backend existed at all
-- Idempotent; safe to re-run; no-op columns on the live DB where they exist.

-- ---------------------------------------------------------------------------
-- 1. Threats & Scans
-- ---------------------------------------------------------------------------
ALTER TABLE public.security_threats
  ADD COLUMN IF NOT EXISTS mitre_technique text,
  ADD COLUMN IF NOT EXISTS cve_ref text,
  ADD COLUMN IF NOT EXISTS remediation_steps jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS detected_at timestamptz,
  ADD COLUMN IF NOT EXISTS affected_model_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.security_scans
  ADD COLUMN IF NOT EXISTS schedule text,
  ADD COLUMN IF NOT EXISTS duration_minutes integer;

ALTER TABLE public.security_vulnerabilities
  ADD COLUMN IF NOT EXISTS patch_date date,
  ADD COLUMN IF NOT EXISTS assignee text,
  ADD COLUMN IF NOT EXISTS patch_evidence text,
  ADD COLUMN IF NOT EXISTS scan_id text,
  ADD COLUMN IF NOT EXISTS cve_ref text;

ALTER TABLE public.attack_surface_assets
  ADD COLUMN IF NOT EXISTS exposure text,          -- public | internal | restricted
  ADD COLUMN IF NOT EXISTS protocol text,
  ADD COLUMN IF NOT EXISTS open_ports integer[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS last_scanned_at timestamptz,
  ADD COLUMN IF NOT EXISTS risk_score numeric,
  ADD COLUMN IF NOT EXISTS linked_model_ids uuid[] NOT NULL DEFAULT '{}';

-- ---------------------------------------------------------------------------
-- 2. Red Teaming
-- ---------------------------------------------------------------------------
ALTER TABLE public.red_team_campaigns
  ADD COLUMN IF NOT EXISTS target_model_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS objective text,
  ADD COLUMN IF NOT EXISTS lead text;

ALTER TABLE public.red_team_findings
  ADD COLUMN IF NOT EXISTS finding_ref text,
  ADD COLUMN IF NOT EXISTS title text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS severity text,          -- critical | high | medium | low
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'open', -- open | in_remediation | resolved | accepted
  ADD COLUMN IF NOT EXISTS attack_vector text,
  ADD COLUMN IF NOT EXISTS owasp_llm_ref text,     -- e.g. LLM01 Prompt Injection
  ADD COLUMN IF NOT EXISTS cvss numeric,
  ADD COLUMN IF NOT EXISTS model_id uuid,          -- → ai_models.id
  ADD COLUMN IF NOT EXISTS impact text,
  ADD COLUMN IF NOT EXISTS recommendation text,
  ADD COLUMN IF NOT EXISTS remediation_owner text,
  ADD COLUMN IF NOT EXISTS discovered_by text,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS evidence jsonb NOT NULL DEFAULT '{}'::jsonb;

-- red_team_findings had RLS enabled but NO policy (deny-all) — org isolation:
DROP POLICY IF EXISTS red_team_findings_org_all ON public.red_team_findings;
CREATE POLICY red_team_findings_org_all ON public.red_team_findings
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());
ALTER TABLE public.red_team_findings ALTER COLUMN org_id SET DEFAULT current_user_org_id();

ALTER TABLE public.model_arena_runs
  ADD COLUMN IF NOT EXISTS model_id uuid,          -- → ai_models.id (org registry)
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS prompt_injection_resistance numeric,
  ADD COLUMN IF NOT EXISTS jailbreak_resistance numeric,
  ADD COLUMN IF NOT EXISTS output_safety numeric,
  ADD COLUMN IF NOT EXISTS pii_leakage numeric,
  ADD COLUMN IF NOT EXISTS hallucination_rate numeric,
  ADD COLUMN IF NOT EXISTS bias_score numeric,
  ADD COLUMN IF NOT EXISTS overall_score numeric,
  ADD COLUMN IF NOT EXISTS evaluated_at timestamptz,
  ADD COLUMN IF NOT EXISTS run_by text;

-- ---------------------------------------------------------------------------
-- 3. Defense & Policies
-- ---------------------------------------------------------------------------
ALTER TABLE public.policy_firewall_rules
  ADD COLUMN IF NOT EXISTS rule_type text,         -- prompt_injection | pii | jailbreak | data_exfil | toxicity | custom
  ADD COLUMN IF NOT EXISTS pattern text,
  ADD COLUMN IF NOT EXISTS action text,            -- block | redact | flag | require_approval
  ADD COLUMN IF NOT EXISTS target text,
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS priority integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS evaluations bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocked bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_triggered_at timestamptz,
  ADD COLUMN IF NOT EXISTS linked_model_ids uuid[] NOT NULL DEFAULT '{}';

ALTER TABLE public.keys_vault
  ADD COLUMN IF NOT EXISTS provider text,
  ADD COLUMN IF NOT EXISTS key_prefix text,        -- display prefix only, e.g. sk-prod-a1
  ADD COLUMN IF NOT EXISTS key_hash text,          -- sha256 of the secret; secret itself is NEVER stored
  ADD COLUMN IF NOT EXISTS scopes text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS rotated_at timestamptz,
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_used_at timestamptz,
  ADD COLUMN IF NOT EXISTS usage_count bigint NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS linked_agent_id uuid;   -- → agent registry

-- Security reports: real backend (templates + runs with a data snapshot).
CREATE TABLE IF NOT EXISTS public.security_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  name text NOT NULL,
  category text,                                   -- posture | vulnerabilities | red_team | compliance | executive
  description text,
  frequency text,                                  -- on_demand | weekly | monthly | quarterly
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  recipients text[] NOT NULL DEFAULT '{}',
  format text NOT NULL DEFAULT 'json',             -- json | csv
  generation_count integer NOT NULL DEFAULT 0,
  last_generated_at timestamptz,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.security_reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS security_reports_org_all ON public.security_reports;
CREATE POLICY security_reports_org_all ON public.security_reports
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

CREATE TABLE IF NOT EXISTS public.security_report_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  report_id uuid REFERENCES public.security_reports(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'completed',        -- completed | failed
  generated_by text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  format text NOT NULL DEFAULT 'json',
  -- The actual report payload: a data-driven snapshot of the security tables
  -- at generation time. The UI downloads this — a real artifact, not theatre.
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  size_bytes integer,
  error text
);
ALTER TABLE public.security_report_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS security_report_runs_org_all ON public.security_report_runs;
CREATE POLICY security_report_runs_org_all ON public.security_report_runs
  FOR ALL TO authenticated
  USING (org_id = current_user_org_id())
  WITH CHECK (org_id = current_user_org_id());

CREATE INDEX IF NOT EXISTS idx_security_report_runs_report ON public.security_report_runs(report_id, generated_at DESC);

-- ---------------------------------------------------------------------------
-- 4. Close the anon-writable demo doc tables (audit item #4).
--    Pages are repointed to the canonical tables in the same change; these
--    demo tables become deny-all (RLS stays enabled, no policies remain).
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'attacksurface_table','policyfirewall_table','keysvault_table',
    'reportgenerator_table','redteamlab_table','redteamfindings_table'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    -- the demo doc tables were created with a %I_anon_all open policy
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_anon_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_all', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 5. Org defaults so client writes never carry the scoping column.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'security_threats','security_scans','security_vulnerabilities',
    'attack_surface_assets','red_team_campaigns','model_arena_runs',
    'policy_firewall_rules','keys_vault'
  ] LOOP
    IF to_regclass('public.' || t) IS NULL THEN CONTINUE; END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name=t
                 AND column_name='org_id' AND data_type='uuid') THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET DEFAULT current_user_org_id()', t);
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name=t AND column_name='tenant_id') THEN
      EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET DEFAULT (current_user_org_id())::text', t);
    END IF;
  END LOOP;
END $$;
