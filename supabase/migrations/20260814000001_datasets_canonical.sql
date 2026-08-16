-- =============================================================================
-- Datasets — canonical backend for the AI Assets group (Dataset Registry,
-- Data Lineage, Data Quality). Consolidation target per
-- docs/architecture/db/schema_consolidation_plan.sql:
--   datasets <= Dataset, dataset_registry, dataset_catalog_entries, datasetregistry_table
-- Idempotent; safe to re-run.
-- =============================================================================

-- 1. Org scoping: let the DB fill tenant_id (same discipline as ai_models),
--    so the client never supplies the scoping column.
ALTER TABLE public.datasets
  ALTER COLUMN tenant_id SET DEFAULT (current_user_org_id())::text;

-- 2. Columns the registry/lineage views govern that the table lacked.
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS record_count      bigint;
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS encryption        text;
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS retention_policy  text;
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS last_audit_date   date;
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS pii_types         text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS upstream_sources  text[] NOT NULL DEFAULT '{}';
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS ingestion_method  text;
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS sla               text;
ALTER TABLE public.datasets ADD COLUMN IF NOT EXISTS schema_definition jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_datasets_tenant ON public.datasets(tenant_id) WHERE NOT is_deleted;

-- 3. Data quality assessments — real, org-scoped records (EU AI Act Art. 10),
--    keyed to datasets.id and ai_models.id (uuid), replacing dataquality_table.
CREATE TABLE IF NOT EXISTS public.data_quality_assessments (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          text NOT NULL DEFAULT (current_user_org_id())::text,
  dataset_id         text NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  model_id           uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  completeness       numeric CHECK (completeness       BETWEEN 0 AND 100),
  accuracy           numeric CHECK (accuracy           BETWEEN 0 AND 100),
  consistency        numeric CHECK (consistency        BETWEEN 0 AND 100),
  representativeness numeric CHECK (representativeness BETWEEN 0 AND 100),
  bias_score         numeric CHECK (bias_score         BETWEEN 0 AND 1),
  relevance          numeric CHECK (relevance          BETWEEN 0 AND 100),
  timeliness         numeric CHECK (timeliness         BETWEEN 0 AND 100),
  overall_score      numeric CHECK (overall_score      BETWEEN 0 AND 100),
  art10_status       text CHECK (art10_status IN ('met','partial','not_met')),
  assessment_method  text NOT NULL DEFAULT 'automated'
                     CHECK (assessment_method IN ('automated','manual','hybrid')),
  assessor           text,
  deficiencies       jsonb NOT NULL DEFAULT '[]'::jsonb,
  assessed_at        date NOT NULL DEFAULT CURRENT_DATE,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.data_quality_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS data_quality_assessments_org ON public.data_quality_assessments;
CREATE POLICY data_quality_assessments_org ON public.data_quality_assessments
  FOR ALL TO authenticated
  USING (tenant_id = (current_user_org_id())::text)
  WITH CHECK (tenant_id = (current_user_org_id())::text);

CREATE INDEX IF NOT EXISTS idx_dqa_dataset ON public.data_quality_assessments(dataset_id);
CREATE INDEX IF NOT EXISTS idx_dqa_model   ON public.data_quality_assessments(model_id);
CREATE INDEX IF NOT EXISTS idx_dqa_tenant  ON public.data_quality_assessments(tenant_id);
