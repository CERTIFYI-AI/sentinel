-- ---------------------------------------------------------------------------
-- AI Supply Chain (AIBOM / Provenance / Attestations) + Sustainability & ESG —
-- canonical schema.
--
-- WHY. The supply-chain and ESG audits found these modules asserting
-- assurance that was never performed:
--   * the AIBOM "SHA-256" was Math.random(), and it fed the integrity PASS;
--   * "Known CVEs" was a tally of a dropdown the user picked, displayed beside
--     "Scanner: Sentinel CVE Scanner + OSV.dev" — no scan ever ran;
--   * the attestation "Signature Valid" check was `sigHash !== 'PENDING'` on a
--     free-text field, under a heading reading "Cryptographic Verification";
--   * the signer was the hardcoded string 'James Liu';
--   * carbon/energy efficiency scores came from magic coefficients.
--
-- The decision recorded for this change: STOP CLAIMING VERIFICATION WE DO NOT
-- PERFORM, and give real signing a schema to land in. So every integrity field
-- below is explicit about its provenance — a self-declared digest is stored in
-- `declared_digest` and can never be mistaken for a verified one, which lives
-- in `verification_status` / `verified_at` and is only ever written by a
-- verifier. Until real DSSE/Sigstore verification ships, verification_status
-- stays 'unverified' and the UI renders it as such.
--
-- Idempotent; safe to re-run.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 1. AIBOM: records, components, and CVEs as real rows.
--    `vulnerabilities integer` was a hand-entered count; CVEs are rows.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.aibom_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  aibom_ref text,
  model_id uuid REFERENCES public.ai_models(id) ON DELETE CASCADE,
  model_version text,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  format text NOT NULL DEFAULT 'CycloneDX',      -- CycloneDX | SPDX
  spec_version text,
  serial_number text,                            -- urn:uuid:... for CycloneDX
  document jsonb,                                -- the canonical serialized BOM
  -- Integrity. `declared_digest` is whatever the producer asserted; it is NOT
  -- evidence of anything until a verifier confirms it. Kept deliberately
  -- separate from verification_status so the UI cannot conflate them.
  declared_digest text,
  digest_alg text NOT NULL DEFAULT 'sha256',
  verification_status text NOT NULL DEFAULT 'unverified',  -- unverified|verified|failed
  verified_at timestamptz,
  verified_by uuid,
  verification_method text,
  -- Signing (schema ready; no signature is fabricated in the meantime).
  signature jsonb,                               -- DSSE envelope when signed
  signer_identity text,                          -- Fulcio subject / OIDC issuer
  rekor_log_index text,                          -- Sigstore transparency log
  signed_by uuid,                                -- authenticated signer, never a literal
  signed_at timestamptz,
  -- Provenance of the model weights themselves.
  weights_uri text,
  weights_digest text,
  training_run_ref text,
  fine_tune_parent_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  model_card_ref text,
  annex_iv_doc_id uuid,                          -- → documents.id (EU AI Act Annex IV)
  country_of_origin text,
  export_control_class text,
  eol_at date,
  version integer NOT NULL DEFAULT 1,
  supersedes_id uuid REFERENCES public.aibom_records(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'draft',          -- draft | published | superseded
  generated_at timestamptz NOT NULL DEFAULT now(),
  -- NULL means "never scanned", which must render as an em-dash, not 0.
  last_scanned_at timestamptz,
  scanner_name text,
  notes text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aibom_records_model_idx ON public.aibom_records (model_id);

CREATE TABLE IF NOT EXISTS public.aibom_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  aibom_id uuid REFERENCES public.aibom_records(id) ON DELETE CASCADE,
  component_type text,                           -- library|model|dataset|framework|service
  name text NOT NULL,
  version text,
  purl text,                                     -- pkg:pypi/torch@2.2.0 — required for CVE matching
  cpe text,
  supplier text,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  dataset_id uuid,                               -- → dataset_catalog_entries.id
  license_spdx text,                             -- SPDX identifier, not free text
  license_risk text,                             -- permissive|weak_copyleft|strong_copyleft|commercial|unknown
  digest text,
  is_direct boolean NOT NULL DEFAULT true,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aibom_components_aibom_idx ON public.aibom_components (aibom_id);

CREATE TABLE IF NOT EXISTS public.aibom_vulnerabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  aibom_id uuid REFERENCES public.aibom_records(id) ON DELETE CASCADE,
  component_id uuid REFERENCES public.aibom_components(id) ON DELETE CASCADE,
  cve_id text NOT NULL,
  cvss_score numeric,
  severity text,
  affected_version_range text,
  fixed_version text,
  exploit_known boolean NOT NULL DEFAULT false,
  source text,                                   -- osv.dev | nvd | vendor
  scanned_at timestamptz,
  status text NOT NULL DEFAULT 'open',           -- open | remediated | accepted | false_positive
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS aibom_vulns_aibom_idx ON public.aibom_vulnerabilities (aibom_id);

-- ---------------------------------------------------------------------------
-- 2. supply_chain_attestations: the REAL org-scoped table has existed since
--    functional_integration but nothing read it — the page used a cross-tenant
--    demo table instead. Extend the real one rather than adding a competitor.
-- ---------------------------------------------------------------------------
ALTER TABLE public.supply_chain_attestations
  ADD COLUMN IF NOT EXISTS attestation_ref text,
  ADD COLUMN IF NOT EXISTS attestation_type text,
  -- Polymorphic subject on the one id-space: previously a free-text string, so
  -- an attestation could never be found from the model it described.
  ADD COLUMN IF NOT EXISTS subject_type text,          -- model | dataset | vendor | pipeline
  ADD COLUMN IF NOT EXISTS subject_id uuid,
  ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS scope text,
  ADD COLUMN IF NOT EXISTS findings text,
  ADD COLUMN IF NOT EXISTS attested_by text,
  ADD COLUMN IF NOT EXISTS attestor_user_id uuid,
  ADD COLUMN IF NOT EXISTS attestor_org text,
  ADD COLUMN IF NOT EXISTS attestor_is_independent boolean,
  ADD COLUMN IF NOT EXISTS attestor_accreditation text,
  ADD COLUMN IF NOT EXISTS issued_at date,
  ADD COLUMN IF NOT EXISTS valid_until date,
  -- Same honesty split as AIBOM: declared vs verified.
  ADD COLUMN IF NOT EXISTS declared_digest text,
  ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid,
  ADD COLUMN IF NOT EXISTS verification_method text,
  ADD COLUMN IF NOT EXISTS signature jsonb,
  ADD COLUMN IF NOT EXISTS signer_identity text,
  ADD COLUMN IF NOT EXISTS rekor_log_index text,
  -- An attestation that can never be revoked is not an attestation.
  ADD COLUMN IF NOT EXISTS revoked_at timestamptz,
  ADD COLUMN IF NOT EXISTS revocation_reason text,
  ADD COLUMN IF NOT EXISTS superseded_by uuid,
  ADD COLUMN IF NOT EXISTS renewal_task_id uuid,
  ADD COLUMN IF NOT EXISTS framework_control_ids text[] NOT NULL DEFAULT '{}',  -- → controls.id
  ADD COLUMN IF NOT EXISTS evidence_ids uuid[] NOT NULL DEFAULT '{}',           -- → evidence.id
  ADD COLUMN IF NOT EXISTS review_notes text;
ALTER TABLE public.supply_chain_attestations ALTER COLUMN org_id SET DEFAULT current_user_org_id();
CREATE INDEX IF NOT EXISTS sca_model_idx ON public.supply_chain_attestations (model_id);
CREATE INDEX IF NOT EXISTS sca_vendor_idx ON public.supply_chain_attestations (vendor_id);

-- Validity is DERIVED from the date, never from an authored status literal.
-- The old page reported "Within Validity Period: PASS" purely because someone
-- had left status='Valid', even after valid_until had passed.
CREATE OR REPLACE VIEW public.supply_chain_attestation_status AS
SELECT a.*,
       CASE
         WHEN a.revoked_at IS NOT NULL THEN 'revoked'
         WHEN a.valid_until IS NULL THEN 'unknown'
         WHEN a.valid_until < CURRENT_DATE THEN 'expired'
         WHEN a.valid_until < CURRENT_DATE + 30 THEN 'expiring_soon'
         ELSE 'valid'
       END AS derived_validity
FROM public.supply_chain_attestations a;

-- ---------------------------------------------------------------------------
-- 3. Provenance: a real DAG, replacing two in-file literals keyed by 'MDL-001'.
--    Edges are typed and carry temporal validity so the forensic question
--    "what fed this model on the date of the incident" is answerable.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provenance_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  node_type text NOT NULL,                       -- model|dataset|component|vendor|data_source|pipeline|output
  label text NOT NULL,
  -- Link to the canonical entity when the node represents one.
  model_id uuid REFERENCES public.ai_models(id) ON DELETE CASCADE,
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  dataset_id uuid,
  use_case_id uuid,
  version text,
  artifact_uri text,                             -- immutable OCI/artifact ref
  artifact_digest text,
  source_repo text,
  source_commit text,
  build_id text,
  builder_identity text,
  built_at timestamptz,
  slsa_level text,                               -- SLSA Build L1..L3
  predicate_type text,                           -- in-toto predicate
  verification_status text NOT NULL DEFAULT 'unverified',
  verified_at timestamptz,
  verified_by uuid,
  verification_method text,
  license_spdx text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS provenance_nodes_model_idx ON public.provenance_nodes (model_id);

CREATE TABLE IF NOT EXISTS public.provenance_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL DEFAULT current_user_org_id(),
  source_node_id uuid NOT NULL REFERENCES public.provenance_nodes(id) ON DELETE CASCADE,
  target_node_id uuid NOT NULL REFERENCES public.provenance_nodes(id) ON DELETE CASCADE,
  edge_type text NOT NULL,                       -- derived_from|trained_on|built_by|deployed_as|feeds|uses|produces
  -- Cross-border transfer facts. The old graph asserted "SCCs required" from a
  -- single hardcoded boolean, with no jurisdiction or adequacy input.
  source_jurisdiction text,
  target_jurisdiction text,
  transfer_mechanism text,                       -- SCC|BCR|adequacy|derogation|none
  legal_basis text,
  pii_categories text[] NOT NULL DEFAULT '{}',
  retention_period text,
  valid_from timestamptz,
  valid_to timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT provenance_edges_no_self_loop CHECK (source_node_id <> target_node_id)
);
CREATE INDEX IF NOT EXISTS provenance_edges_source_idx ON public.provenance_edges (source_node_id);
CREATE INDEX IF NOT EXISTS provenance_edges_target_idx ON public.provenance_edges (target_node_id);

-- ---------------------------------------------------------------------------
-- 4. Emission factors — the ESG audit found carbon numbers derived from bare
--    coefficients (320 kg/B-params, 0.00085 kg/inference) with no source,
--    region or version, and never labelled as estimates in the UI. A factor
--    must be citable before a figure derived from it can be shown.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.emission_factors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_ref text UNIQUE,
  name text NOT NULL,
  factor_value numeric NOT NULL,
  factor_unit text NOT NULL,                     -- kgCO2e/kWh | kgCO2e/1B-params | kgCO2e/inference
  region text,
  grid_intensity_g_per_kwh numeric,
  source text NOT NULL,                          -- e.g. 'IEA 2024', 'ML CO2 Impact'
  source_url text,
  published_year integer,
  version text,
  is_system boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.emission_factors ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS emission_factors_read ON public.emission_factors;
CREATE POLICY emission_factors_read ON public.emission_factors
  FOR SELECT TO authenticated USING (true);   -- global reference catalog, no tenant data

-- ---------------------------------------------------------------------------
-- 5. carbon_records: the table only ever got the generic 18-column shell, so
--    all 13 domain columns the Carbon Ledger writes were missing and every save
--    failed silently. Add them, on the one id-space, with the measurement
--    method recorded so an estimate is never presented as a measurement.
-- ---------------------------------------------------------------------------
ALTER TABLE public.carbon_records
  ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS period text,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS training_emissions numeric,
  ADD COLUMN IF NOT EXISTS inference_emissions numeric,
  ADD COLUMN IF NOT EXISTS total_emissions numeric,
  ADD COLUMN IF NOT EXISTS energy_kwh numeric,
  ADD COLUMN IF NOT EXISTS renewable_percent numeric,
  ADD COLUMN IF NOT EXISTS compute_provider text,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS offset_tco2e numeric,
  ADD COLUMN IF NOT EXISTS net_emissions numeric,
  ADD COLUMN IF NOT EXISTS verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS efficiency_score numeric,
  -- Provenance of the number itself.
  ADD COLUMN IF NOT EXISTS measurement_method text,       -- measured | calculated | estimated
  ADD COLUMN IF NOT EXISTS emission_factor_id uuid REFERENCES public.emission_factors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS ghg_scope text,                -- scope_1 | scope_2_market | scope_2_location | scope_3
  ADD COLUMN IF NOT EXISTS gpu_hours numeric,
  ADD COLUMN IF NOT EXISTS tokens_processed bigint,
  ADD COLUMN IF NOT EXISTS accelerator_type text,
  ADD COLUMN IF NOT EXISTS pue numeric,
  ADD COLUMN IF NOT EXISTS water_usage_m3 numeric,
  ADD COLUMN IF NOT EXISTS offset_registry text,
  ADD COLUMN IF NOT EXISTS offset_serial text,
  ADD COLUMN IF NOT EXISTS offset_vintage_year integer,
  ADD COLUMN IF NOT EXISTS offset_retired_at date,
  ADD COLUMN IF NOT EXISTS assurance_body text,
  ADD COLUMN IF NOT EXISTS assurance_date date,
  ADD COLUMN IF NOT EXISTS methodology text;
-- TD-003: converge on the single mandated resolver (was public.get_org_id()).
ALTER TABLE public.carbon_records ALTER COLUMN org_id SET DEFAULT current_user_org_id();
CREATE INDEX IF NOT EXISTS carbon_records_model_idx ON public.carbon_records (model_id);

-- ---------------------------------------------------------------------------
-- 6. energy_metrics: join the one id-space; the page wrote a `model` column
--    that does not exist (the real one is model_name), rejecting every insert.
-- ---------------------------------------------------------------------------
ALTER TABLE public.energy_metrics
  ADD COLUMN IF NOT EXISTS model_id uuid REFERENCES public.ai_models(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS accelerator_type text,
  ADD COLUMN IF NOT EXISTS gpu_utilization_percent numeric,
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS grid_intensity_g_per_kwh numeric,
  ADD COLUMN IF NOT EXISTS co2e_kg numeric,
  ADD COLUMN IF NOT EXISTS emission_factor_id uuid REFERENCES public.emission_factors(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS instance_count integer,
  ADD COLUMN IF NOT EXISTS deployment_type text,          -- cloud | on_prem | hybrid
  ADD COLUMN IF NOT EXISTS water_usage_m3 numeric;
ALTER TABLE public.energy_metrics ALTER COLUMN org_id SET DEFAULT current_user_org_id();
CREATE INDEX IF NOT EXISTS energy_metrics_model_idx ON public.energy_metrics (model_id);

-- efficiency_score was seeded on two different scales (87.3 and 0.74) with no
-- declared unit, so half the rows rendered as catastrophic in a /100 UI.
-- Normalise the 0–1 rows, then constrain the column.
UPDATE public.energy_metrics
SET efficiency_score = efficiency_score * 100
WHERE efficiency_score IS NOT NULL AND efficiency_score > 0 AND efficiency_score <= 1;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'energy_metrics_efficiency_scale_chk') THEN
    ALTER TABLE public.energy_metrics ADD CONSTRAINT energy_metrics_efficiency_scale_chk
      CHECK (efficiency_score IS NULL OR (efficiency_score >= 0 AND efficiency_score <= 100));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 7. esg_reports: assurance, approver and framework version — the fields that
--    separate a disclosure from a draft. Also a canonical lowercase status
--    vocabulary: seeds previously wrote 'published'/'Published'/'DRAFT', so the
--    KPI strip was dead against half the data and published reports rendered
--    with the Draft badge.
-- ---------------------------------------------------------------------------
ALTER TABLE public.esg_reports
  ADD COLUMN IF NOT EXISTS framework_version text,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS assurance_status text,        -- none | limited | reasonable
  ADD COLUMN IF NOT EXISTS assurance_provider text,
  ADD COLUMN IF NOT EXISTS assurance_date date,
  ADD COLUMN IF NOT EXISTS approver text,
  ADD COLUMN IF NOT EXISTS approved_by uuid,
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS reporting_boundary text,
  ADD COLUMN IF NOT EXISTS consolidation_basis text,
  ADD COLUMN IF NOT EXISTS is_restatement boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS restatement_reason text,
  ADD COLUMN IF NOT EXISTS materiality_topics text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS scope1_tco2e numeric,
  ADD COLUMN IF NOT EXISTS scope2_tco2e numeric,
  ADD COLUMN IF NOT EXISTS scope3_tco2e numeric,
  -- The evidence chain: a report must cite the records it reports on.
  ADD COLUMN IF NOT EXISTS carbon_record_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS energy_metric_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS model_ids uuid[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS document_id uuid,
  ADD COLUMN IF NOT EXISTS methodology text;
ALTER TABLE public.esg_reports ALTER COLUMN org_id SET DEFAULT current_user_org_id();

UPDATE public.esg_reports SET status = lower(status) WHERE status IS NOT NULL AND status <> lower(status);

-- ---------------------------------------------------------------------------
-- 8. RLS for the new supply-chain tables.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'aibom_records','aibom_components','aibom_vulnerabilities',
    'provenance_nodes','provenance_edges'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_org_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      || 'USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id())',
      t || '_org_all', t);
    -- See the note in 20260822000001: granted explicitly so the table is
    -- writable on a from-zero replay without relying on ambient defaults.
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role', t);
  END LOOP;
END $$;
GRANT SELECT ON public.emission_factors TO authenticated;
GRANT ALL ON public.emission_factors TO service_role;
GRANT SELECT ON public.supply_chain_attestation_status TO authenticated;

-- ---------------------------------------------------------------------------
-- 9. CONTAINMENT for the remaining `(id, doc jsonb)` demo tables (TD-001).
--
--    close_anon_rls revoked `anon`, but because these tables have no org_id
--    column it installed `FOR ALL TO authenticated USING (true)` — i.e. any
--    authenticated user in ANY org can read and write every other tenant's
--    rows. The cross-tenant regression check excludes '%\_table', so this never
--    tripped the gate. The four modules in this change move to real tables
--    above; every OTHER demo table is contained here by adding the scoping
--    column and an org-scoped policy, so no tenant data is exposed while the
--    remaining modules await their own rollout.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND c.relname LIKE '%\_table'
  LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS org_id uuid NOT NULL DEFAULT current_user_org_id()', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    -- Drop the permissive predicates installed by the demo-table batches.
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_anon_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_authenticated_all', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_org_all', t);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated '
      || 'USING (org_id = current_user_org_id()) WITH CHECK (org_id = current_user_org_id())',
      t || '_org_all', t);
  END LOOP;
END $$;
