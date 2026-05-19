-- Sentinel P0 Gap Migration - Applied 2026-04-21
-- Fixes: organizations columns, settings tables, org_id backfill, ESG realtime
-- All statements use IF NOT EXISTS - safe to re-run

-- ============================================================================
-- 1. Organizations table — add missing settings columns
-- ============================================================================
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS company_size   text,
  ADD COLUMN IF NOT EXISTS primary_contact text,
  ADD COLUMN IF NOT EXISTS timezone        text NOT NULL DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS fiscal_year_start text NOT NULL DEFAULT 'January';

-- ============================================================================
-- 2. SSO / Authentication config
-- One row per organization (unique on org_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.sso_config (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id                  uuid NOT NULL DEFAULT public.get_org_id(),
  provider                text NOT NULL DEFAULT 'none',  -- 'none' | 'okta' | 'azure_ad' | 'google' | 'onelogin'
  is_active               boolean NOT NULL DEFAULT false,
  mfa_required            boolean NOT NULL DEFAULT false,
  session_timeout_minutes integer NOT NULL DEFAULT 480,
  ip_whitelist            text[]  NOT NULL DEFAULT '{}',
  metadata                jsonb   NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sso_config_org_id_unique UNIQUE (org_id)
);

ALTER TABLE public.sso_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sso_config_tenant ON public.sso_config;
CREATE POLICY sso_config_tenant ON public.sso_config FOR ALL TO authenticated
  USING  (org_id = public.get_org_id())
  WITH CHECK (org_id = public.get_org_id());

DROP POLICY IF EXISTS sso_config_service_role ON public.sso_config;
CREATE POLICY sso_config_service_role ON public.sso_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 3. Data retention policies
-- One row per org_id + category combination
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL DEFAULT public.get_org_id(),
  category         text NOT NULL,          -- e.g. 'Audit Logs', 'Evidence Artifacts'
  retention_period text NOT NULL DEFAULT '7 years',
  auto_archive     boolean NOT NULL DEFAULT false,
  auto_delete      boolean NOT NULL DEFAULT false,
  metadata         jsonb   NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT data_retention_policies_org_category UNIQUE (org_id, category)
);

ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS data_retention_policies_tenant ON public.data_retention_policies;
CREATE POLICY data_retention_policies_tenant ON public.data_retention_policies FOR ALL TO authenticated
  USING  (org_id = public.get_org_id())
  WITH CHECK (org_id = public.get_org_id());

DROP POLICY IF EXISTS data_retention_policies_service_role ON public.data_retention_policies;
CREATE POLICY data_retention_policies_service_role ON public.data_retention_policies FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 4. Notification preferences
-- Multiple rows per org (channel × event_type combinations)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.notification_prefs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id     uuid NOT NULL DEFAULT public.get_org_id(),
  channel    text NOT NULL,      -- 'email' | 'slack' | 'sms' | 'in_app'
  event_type text NOT NULL,      -- e.g. 'Incidents', 'Bias Alerts'
  is_enabled boolean NOT NULL DEFAULT true,
  config     jsonb   NOT NULL DEFAULT '{}',  -- channel-specific config (webhook URL, etc.)
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notification_prefs_org_idx ON public.notification_prefs (org_id);
CREATE INDEX IF NOT EXISTS notification_prefs_channel_event_idx ON public.notification_prefs (org_id, channel, event_type);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_prefs_tenant ON public.notification_prefs;
CREATE POLICY notification_prefs_tenant ON public.notification_prefs FOR ALL TO authenticated
  USING  (org_id = public.get_org_id())
  WITH CHECK (org_id = public.get_org_id());

DROP POLICY IF EXISTS notification_prefs_service_role ON public.notification_prefs;
CREATE POLICY notification_prefs_service_role ON public.notification_prefs FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 5. Audit trail configuration
-- One row per organization (unique on org_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.audit_trail_config (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id              uuid NOT NULL DEFAULT public.get_org_id(),
  retention_days      integer NOT NULL DEFAULT 2555,   -- 7 years
  log_read_events     boolean NOT NULL DEFAULT false,
  log_auth_events     boolean NOT NULL DEFAULT true,
  log_data_changes    boolean NOT NULL DEFAULT true,
  log_admin_actions   boolean NOT NULL DEFAULT true,
  export_enabled      boolean NOT NULL DEFAULT true,
  siem_integration    text,                            -- e.g. 'splunk' | 'datadog'
  siem_endpoint       text,
  metadata            jsonb   NOT NULL DEFAULT '{}',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT audit_trail_config_org_id_unique UNIQUE (org_id)
);

ALTER TABLE public.audit_trail_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS audit_trail_config_tenant ON public.audit_trail_config;
CREATE POLICY audit_trail_config_tenant ON public.audit_trail_config FOR ALL TO authenticated
  USING  (org_id = public.get_org_id())
  WITH CHECK (org_id = public.get_org_id());

DROP POLICY IF EXISTS audit_trail_config_service_role ON public.audit_trail_config;
CREATE POLICY audit_trail_config_service_role ON public.audit_trail_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 6. Appearance / UI configuration
-- One row per organization (unique on org_id)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.appearance_config (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id           uuid NOT NULL DEFAULT public.get_org_id(),
  theme            text NOT NULL DEFAULT 'dark',     -- 'light' | 'dark' | 'system'
  accent_color     text NOT NULL DEFAULT 'emerald',
  density          text NOT NULL DEFAULT 'default',  -- 'compact' | 'default' | 'comfortable'
  sidebar_collapsed boolean NOT NULL DEFAULT false,
  metadata         jsonb NOT NULL DEFAULT '{}',
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT appearance_config_org_id_unique UNIQUE (org_id)
);

ALTER TABLE public.appearance_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS appearance_config_tenant ON public.appearance_config;
CREATE POLICY appearance_config_tenant ON public.appearance_config FOR ALL TO authenticated
  USING  (org_id = public.get_org_id())
  WITH CHECK (org_id = public.get_org_id());

DROP POLICY IF EXISTS appearance_config_service_role ON public.appearance_config;
CREATE POLICY appearance_config_service_role ON public.appearance_config FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================================
-- 7. org_id backfill — populate org_id for existing rows in all tables
--    Uses first organization row as the default org
-- ============================================================================
DO $$
DECLARE
  _org_id uuid;
  t text;
  tables_needing_backfill text[] := ARRAY[
    'sso_config', 'data_retention_policies', 'notification_prefs',
    'audit_trail_config', 'appearance_config',
    'api_keys', 'departments', 'roles', 'committees',
    'training_courses', 'bcp_plans', 'ethics_reports', 'assets',
    'identities', 'bia_processes', 'risk_register', 'ai_models', 'tasks'
  ];
BEGIN
  -- Get the first org id
  SELECT id INTO _org_id FROM public.organizations LIMIT 1;
  IF _org_id IS NULL THEN
    RAISE NOTICE 'No organizations row found — skipping org_id backfill';
    RETURN;
  END IF;

  FOREACH t IN ARRAY tables_needing_backfill LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'org_id'
    ) THEN
      EXECUTE format(
        'UPDATE public.%I SET org_id = %L WHERE org_id IS NULL',
        t, _org_id
      );
      RAISE NOTICE 'Backfilled org_id on table %', t;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 8. ESG / Carbon records realtime — enable replica identity and publication
-- ============================================================================
DO $$
DECLARE
  esg_tables text[] := ARRAY[
    'carbon_records', 'esg_metrics', 'esg_reports',
    'sustainability_targets', 'supply_chain_attestations'
  ];
  t text;
BEGIN
  FOREACH t IN ARRAY esg_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format('ALTER TABLE public.%I REPLICA IDENTITY FULL', t);
      IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
        RAISE NOTICE 'Added % to supabase_realtime publication', t;
      END IF;
    END IF;
  END LOOP;
END $$;

-- ============================================================================
-- 9. updated_at triggers for new tables
-- ============================================================================
DO $$
DECLARE
  t text;
  new_tables text[] := ARRAY[
    'sso_config', 'data_retention_policies', 'notification_prefs',
    'audit_trail_config', 'appearance_config'
  ];
BEGIN
  FOREACH t IN ARRAY new_tables LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = t
    ) THEN
      EXECUTE format(
        'DROP TRIGGER IF EXISTS trg_set_updated_at ON public.%I;
         CREATE TRIGGER trg_set_updated_at
           BEFORE UPDATE ON public.%I
           FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();',
        t, t
      );
    END IF;
  END LOOP;
END $$;
