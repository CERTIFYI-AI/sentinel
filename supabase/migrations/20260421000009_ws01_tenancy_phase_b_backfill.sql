-- REPLAY NOTE: backfill joins compare as text — fk columns are uuid on the
-- live DB but text in parts of the repo-replayed schema; the cast works on both.
-- ================================================================
-- WS0.1 — Multi-tenancy hardening — PHASE B
-- Adds org_id to tables that had NO tenancy column, and adds the
-- canonical audit columns (created_at, updated_at, created_by,
-- updated_by, deleted_at) where missing.
--
-- Tables split into two groups:
--   (B1) "parent-scoped": tenancy inherited from a parent row via FK
--        backfill. Keeps referential integrity.
--   (B2) "orphan/global-by-default": tenancy cannot be inferred →
--        backfilled to the default org.
--
-- Global tables (organizations, tenants, policy_templates,
-- framework_sections, maturity_dimensions) are INTENTIONALLY left
-- without org_id — they are catalogs shared across tenants.
-- ================================================================

BEGIN;

-- ---------------------------------------------------------------
-- B1. Parent-scoped tables. For each, we derive org_id from the
--     parent row when possible.
-- ---------------------------------------------------------------

-- document_versions.document_id → documents.org_id
ALTER TABLE public.document_versions ADD COLUMN IF NOT EXISTS org_id uuid;
UPDATE public.document_versions dv SET org_id = d.org_id
  FROM public.documents d
  WHERE dv.document_id::text = d.id::text AND dv.org_id IS NULL;

-- incident_workflow_steps.incident_id → incidents.org_id
ALTER TABLE public.incident_workflow_steps ADD COLUMN IF NOT EXISTS org_id uuid;
UPDATE public.incident_workflow_steps s SET org_id = i.org_id
  FROM public.incidents i
  WHERE s.incident_id::text = i.id::text AND s.org_id IS NULL;

-- workflow_step_actions.workflow_instance_id → workflow_instances.org_id
ALTER TABLE public.workflow_step_actions ADD COLUMN IF NOT EXISTS org_id uuid;
UPDATE public.workflow_step_actions a SET org_id = w.org_id
  FROM public.workflow_instances w
  WHERE a.workflow_instance_id::text = w.id::text AND a.org_id IS NULL;

-- event_cascade_links.parent_event_id → governance_events.org_id
-- (NB. already has org_id from governance-mesh work; no-op guard.)
ALTER TABLE public.event_cascade_links ADD COLUMN IF NOT EXISTS org_id uuid;
UPDATE public.event_cascade_links l SET org_id = g.org_id
  FROM public.governance_events g
  WHERE l.parent_event_id::text = g.id::text AND l.org_id IS NULL;

-- audit_findings.audit_id → audits.org_id (audits was unified in Phase A)
ALTER TABLE public.audit_findings ADD COLUMN IF NOT EXISTS org_id uuid;
UPDATE public.audit_findings f SET org_id = a.org_id
  FROM public.audits a
  WHERE f.audit_id::text = a.id::text AND f.org_id IS NULL;

-- vendor_questionnaires.vendor_id → vendors.org_id
ALTER TABLE public.vendor_questionnaires ADD COLUMN IF NOT EXISTS org_id uuid;
UPDATE public.vendor_questionnaires q SET org_id = v.org_id
  FROM public.vendors v
  WHERE q.vendor_id::text = v.id::text AND q.org_id IS NULL;

-- training_assignments.user_id → user_profiles.org_id
ALTER TABLE public.training_assignments ADD COLUMN IF NOT EXISTS org_id uuid;
UPDATE public.training_assignments ta SET org_id = u.org_id
  FROM public.user_profiles u
  WHERE ta.user_id::text = u.id::text AND ta.org_id IS NULL;

-- observability_metrics is infra-wide; treat as global-by-default.
ALTER TABLE public.observability_metrics ADD COLUMN IF NOT EXISTS org_id uuid;

-- module_health is infra-wide; treat as global-by-default.
ALTER TABLE public.module_health ADD COLUMN IF NOT EXISTS org_id uuid;

-- ---------------------------------------------------------------
-- B2. Backfill any remaining NULL org_id to default org, then enforce
--     NOT NULL + FK + index. Idempotent.
-- ---------------------------------------------------------------
DO $$
DECLARE
  t text;
  b1_tables text[] := ARRAY[
    'document_versions','incident_workflow_steps','workflow_step_actions',
    'event_cascade_links','audit_findings','vendor_questionnaires',
    'training_assignments','observability_metrics','module_health'
  ];
BEGIN
  FOREACH t IN ARRAY b1_tables LOOP
    EXECUTE format(
      'UPDATE public.%I SET org_id = $1 WHERE org_id IS NULL;', t
    ) USING '00000000-0000-0000-0000-000000000000'::uuid;

    EXECUTE format('ALTER TABLE public.%I ALTER COLUMN org_id SET NOT NULL;', t);

    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I;',
      t, t || '_org_id_fkey'
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (org_id) REFERENCES public.organizations(id) ON DELETE RESTRICT;',
      t, t || '_org_id_fkey'
    );
    EXECUTE format(
      'CREATE INDEX IF NOT EXISTS %I ON public.%I (org_id);',
      'idx_' || t || '_org_id', t
    );
  END LOOP;
END $$;

-- ---------------------------------------------------------------
-- B3. Canonical audit columns on every live tenant-scoped table.
--     (created_at/updated_at already present on most; this is the
--     convergent pass to add missing ones.)
-- ---------------------------------------------------------------
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.table_name
    FROM information_schema.columns c
    JOIN information_schema.tables tb
      ON tb.table_schema = c.table_schema AND tb.table_name = c.table_name
    WHERE c.table_schema = 'public'
      AND c.column_name = 'org_id'
      AND tb.table_type = 'BASE TABLE'
      AND c.table_name !~ '^[A-Z]'  -- skip PascalCase legacy
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I
         ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
         ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
         ADD COLUMN IF NOT EXISTS created_by uuid,
         ADD COLUMN IF NOT EXISTS updated_by uuid,
         ADD COLUMN IF NOT EXISTS deleted_at timestamptz;',
      t.table_name
    );
  END LOOP;
END $$;

COMMIT;
