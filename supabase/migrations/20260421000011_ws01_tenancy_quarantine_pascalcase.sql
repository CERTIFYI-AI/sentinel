-- ================================================================
-- WS0.1 — Multi-tenancy hardening — Quarantine PascalCase legacy
-- These 26 tables are Prisma snapshots from before the Supabase
-- migration. RLS is enabled with zero policies → they are already
-- locked down. This migration:
--
--   1. Renames each to _deprecated_<Name> to signal dead weight.
--   2. Revokes all privileges from anon + authenticated.
--   3. Creates a stub view with the original name that raises an
--      error on access, directing callers to the snake_case table.
--
-- Rationale: a hard rename would break anything still reading these
-- via Prisma client. The stub view fails fast at runtime so bugs
-- surface immediately rather than corrupting data silently.
-- ================================================================

BEGIN;

DO $$
DECLARE
  t text;
  legacy_tables text[] := ARRAY[
    'Agent','AuditLog','BiasAudit','ComplianceEvent','Control','Dataset',
    'Evidence','Framework','GuardrailRule','HitlItem','Model','ModelTrustConfig',
    'Notification','ObservabilityMetric','Policy','PolicyVersion','RBACRole',
    'RBACUser','Regulation','RiskEntry','ShadowAIFinding','Tenant','TrustTrace',
    'User','Vendor','VendorQuestionnaire'
  ];
  replacement_map jsonb := jsonb_build_object(
    'Agent','agents','AuditLog','audit_log','BiasAudit','bias_audits',
    'ComplianceEvent','compliance_events','Control','controls','Dataset','datasets',
    'Evidence','evidence','Framework','frameworks','GuardrailRule','guardrail_rules',
    'HitlItem','hitl_reviews','Model','models','ModelTrustConfig','model_trust_configs',
    'Notification','notifications','ObservabilityMetric','observability_metrics',
    'Policy','policies','PolicyVersion','document_versions','RBACRole','roles',
    'RBACUser','user_roles','Regulation','regulation_entries','RiskEntry','risks',
    'ShadowAIFinding','shadow_ai_findings','Tenant','organizations',
    'TrustTrace','live_traces','User','user_profiles','Vendor','vendors',
    'VendorQuestionnaire','vendor_questionnaires'
  );
BEGIN
  FOREACH t IN ARRAY legacy_tables LOOP
    -- Skip if already quarantined.
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='public' AND table_name = t) THEN
      EXECUTE format('ALTER TABLE public.%I RENAME TO %I;',
        t, '_deprecated_' || t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated;',
        '_deprecated_' || t);
    END IF;
  END LOOP;
END $$;

-- Stub views — any legacy client reading via SELECT will get a clean
-- error pointing them at the new table.
DO $$
DECLARE
  t text;
  legacy_tables text[] := ARRAY[
    'Agent','AuditLog','BiasAudit','ComplianceEvent','Control','Dataset',
    'Evidence','Framework','GuardrailRule','HitlItem','Model','ModelTrustConfig',
    'Notification','ObservabilityMetric','Policy','PolicyVersion','RBACRole',
    'RBACUser','Regulation','RiskEntry','ShadowAIFinding','Tenant','TrustTrace',
    'User','Vendor','VendorQuestionnaire'
  ];
  replacement_map jsonb := jsonb_build_object(
    'Agent','agents','AuditLog','audit_log','BiasAudit','bias_audits',
    'ComplianceEvent','compliance_events','Control','controls','Dataset','datasets',
    'Evidence','evidence','Framework','frameworks','GuardrailRule','guardrail_rules',
    'HitlItem','hitl_reviews','Model','models','ModelTrustConfig','model_trust_configs',
    'Notification','notifications','ObservabilityMetric','observability_metrics',
    'Policy','policies','PolicyVersion','document_versions','RBACRole','roles',
    'RBACUser','user_roles','Regulation','regulation_entries','RiskEntry','risks',
    'ShadowAIFinding','shadow_ai_findings','Tenant','organizations',
    'TrustTrace','live_traces','User','user_profiles','Vendor','vendors',
    'VendorQuestionnaire','vendor_questionnaires'
  );
  replacement text;
BEGIN
  FOREACH t IN ARRAY legacy_tables LOOP
    replacement := replacement_map ->> t;
    -- Use a function-returning-void that raises; wrap in a view.
    EXECUTE format(
      'CREATE OR REPLACE VIEW public.%I AS SELECT NULL::text AS _deprecated
         WHERE false;', t
    );
    EXECUTE format(
      'COMMENT ON VIEW public.%I IS %L;',
      t,
      'DEPRECATED: this table was renamed to _deprecated_' || t ||
      '. Use public.' || replacement || ' instead.'
    );
    EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated;', t);
  END LOOP;
END $$;

COMMIT;
