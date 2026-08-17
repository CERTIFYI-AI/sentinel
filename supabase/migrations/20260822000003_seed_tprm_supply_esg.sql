-- ---------------------------------------------------------------------------
-- Seeds for Vendors/TPRM, AI Supply Chain and Sustainability/ESG.
--
-- WHY. The three groups previously rendered from in-file mock arrays keyed by
-- business codes ('V-001', 'MDL-001', 'AIBOM-001'), which violated the
-- one-id-space rule and meant no record could ever be reached from the model,
-- vendor or dataset it described. Worse, the demo-table hook auto-persisted
-- those mocks INTO Postgres on first load, so the fiction became data.
--
-- Every row below resolves the REAL ai_models.id / vendors.id by name at apply
-- time and skips cleanly when the target is absent, so the file is idempotent
-- and safe on a database that has no demo org.
--
-- All demo content is FICTIONAL and belongs to the fictional "Acme Financial
-- Services" demo tenant. No real person is named: owners/reviewers are role
-- labels ("Head of Sustainability"), never individuals — the previous mocks
-- attributed signed attestations and accepted SOC 2 reports to invented named
-- people, which is an audit-integrity problem, not a cosmetic one.
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 0. Emission factor catalog. Nothing in the carbon module may render a derived
--    figure without citing one of these — the previous code multiplied by bare
--    constants (320 kg/B-params, 0.00085 kg/inference) with no source at all.
-- ---------------------------------------------------------------------------
INSERT INTO public.emission_factors
  (factor_ref, name, factor_value, factor_unit, region, grid_intensity_g_per_kwh,
   source, source_url, published_year, version)
VALUES
  ('EF-GRID-US',    'US average grid intensity',       0.369, 'kgCO2e/kWh', 'US',        369,
   'EPA eGRID', 'https://www.epa.gov/egrid', 2024, '2024.1'),
  ('EF-GRID-EU',    'EU average grid intensity',       0.231, 'kgCO2e/kWh', 'EU',        231,
   'EEA greenhouse gas intensity', 'https://www.eea.europa.eu', 2024, '2024.1'),
  ('EF-GRID-UKW',   'UK grid intensity',               0.207, 'kgCO2e/kWh', 'UK',        207,
   'UK BEIS/DESNZ conversion factors', 'https://www.gov.uk/government/collections/government-conversion-factors-for-company-reporting', 2024, '2024.1'),
  ('EF-GRID-APAC',  'APAC average grid intensity',     0.555, 'kgCO2e/kWh', 'APAC',      555,
   'IEA Emissions Factors', 'https://www.iea.org/data-and-statistics', 2024, '2024.1')
ON CONFLICT (factor_ref) DO NOTHING;

DO $seed$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  m_credit uuid; m_fraud uuid; m_loan uuid; m_support uuid;
  v_openai uuid; v_anthropic uuid; v_azure uuid;
  ef_us uuid; ef_eu uuid;
  a_credit uuid; a_fraud uuid;
  n_model uuid; n_base uuid; n_data uuid; n_etl uuid;
BEGIN
  SELECT id INTO m_credit  FROM public.ai_models WHERE org_id = v_org AND name = 'Credit Risk Scorer'       LIMIT 1;
  SELECT id INTO m_fraud   FROM public.ai_models WHERE org_id = v_org AND name = 'Fraud Detection Engine'   LIMIT 1;
  SELECT id INTO m_loan    FROM public.ai_models WHERE org_id = v_org AND name = 'Loan Approval Assistant'  LIMIT 1;
  SELECT id INTO m_support FROM public.ai_models WHERE org_id = v_org AND name = 'Customer Support Copilot' LIMIT 1;

  SELECT id INTO v_openai    FROM public.vendors WHERE org_id = v_org AND name = 'OpenAI'              LIMIT 1;
  SELECT id INTO v_anthropic FROM public.vendors WHERE org_id = v_org AND name = 'Anthropic'           LIMIT 1;
  SELECT id INTO v_azure     FROM public.vendors WHERE org_id = v_org AND name = 'Microsoft Azure AI'  LIMIT 1;

  SELECT id INTO ef_us FROM public.emission_factors WHERE factor_ref = 'EF-GRID-US' LIMIT 1;
  SELECT id INTO ef_eu FROM public.emission_factors WHERE factor_ref = 'EF-GRID-EU' LIMIT 1;

  -- -------------------------------------------------------------------------
  -- 1. Enrich the existing vendor rows with the real TPRM field model. These
  --    fields previously existed ONLY in the UI mock, so the registry could
  --    never show inherent vs residual risk, DPA state or reassessment cadence.
  -- -------------------------------------------------------------------------
  UPDATE public.vendors SET
    criticality = 'critical', risk_tier_label = 'critical',
    inherent_risk = 'high', residual_risk = 'medium',
    data_classification = 'confidential', data_access_level = 'processes_customer_data',
    data_regions = ARRAY['US'], transfer_mechanism = 'SCC',
    dpa_status = 'signed', dpa_signed_at = CURRENT_DATE - 400, dpa_expires_at = CURRENT_DATE + 330,
    soc2_expires_at = CURRENT_DATE + 210, iso_expires_at = CURRENT_DATE + 180,
    last_pentest_at = CURRENT_DATE - 120,
    subprocessor_count = 4, fourth_party_exposure = 'moderate',
    exit_plan_status = 'documented',
    exit_plan_notes = 'Fallback to Anthropic Claude for advisory workloads; 90-day dual-run window.',
    reassessment_cadence_months = 12, reassessment_due_at = CURRENT_DATE + 45,
    business_owner = 'Head of AI Platform', vendor_manager = 'Procurement Lead',
    contract_start = CURRENT_DATE - 540, renewal_notice_days = 90,
    annual_spend = 840000, spend_currency = 'USD',
    services = 'GPT-4 Turbo and GPT-4o inference for advisory and copilot use cases',
    ai_use = 'foundation_model', website = 'https://openai.com'
  WHERE id = v_openai;

  UPDATE public.vendors SET
    criticality = 'high', risk_tier_label = 'high',
    inherent_risk = 'high', residual_risk = 'low',
    data_classification = 'confidential', data_access_level = 'processes_customer_data',
    data_regions = ARRAY['US'], transfer_mechanism = 'SCC',
    dpa_status = 'signed', dpa_signed_at = CURRENT_DATE - 300, dpa_expires_at = CURRENT_DATE + 430,
    soc2_expires_at = CURRENT_DATE + 260,
    last_pentest_at = CURRENT_DATE - 90,
    subprocessor_count = 3, fourth_party_exposure = 'low',
    exit_plan_status = 'documented',
    exit_plan_notes = 'Compliance summarisation can fail over to the in-house NLP pipeline.',
    reassessment_cadence_months = 12, reassessment_due_at = CURRENT_DATE + 120,
    business_owner = 'Head of Compliance', vendor_manager = 'Procurement Lead',
    contract_start = CURRENT_DATE - 420, renewal_notice_days = 60,
    annual_spend = 320000, spend_currency = 'USD',
    services = 'Claude 3 Opus/Sonnet for compliance document analysis and risk summarisation',
    ai_use = 'foundation_model', website = 'https://anthropic.com'
  WHERE id = v_anthropic;

  UPDATE public.vendors SET
    criticality = 'high', risk_tier_label = 'high',
    inherent_risk = 'medium', residual_risk = 'low',
    data_classification = 'internal', data_access_level = 'hosts_infrastructure',
    data_regions = ARRAY['US','EU'], transfer_mechanism = 'SCC',
    dpa_status = 'signed', dpa_signed_at = CURRENT_DATE - 600, dpa_expires_at = CURRENT_DATE + 130,
    soc2_expires_at = CURRENT_DATE + 90, iso_expires_at = CURRENT_DATE + 400,
    subprocessor_count = 6, fourth_party_exposure = 'moderate',
    exit_plan_status = 'in_progress',
    reassessment_cadence_months = 12, reassessment_due_at = CURRENT_DATE - 10,  -- deliberately overdue
    business_owner = 'Head of Infrastructure', vendor_manager = 'Procurement Lead',
    contract_start = CURRENT_DATE - 700, renewal_notice_days = 90,
    services = 'Model hosting, embeddings and vector search',
    ai_use = 'cloud_platform', website = 'https://azure.microsoft.com'
  WHERE id = v_azure;

  -- Any remaining demo vendors get a defensible baseline rather than NULLs that
  -- would read as "unassessed" in a KPI they are not meant to dominate.
  UPDATE public.vendors
  SET risk_tier_label = COALESCE(risk_tier_label,
        CASE risk_tier WHEN 1 THEN 'critical' WHEN 2 THEN 'high' WHEN 3 THEN 'medium' ELSE 'low' END),
      dpa_status = COALESCE(dpa_status, 'pending'),
      reassessment_cadence_months = COALESCE(reassessment_cadence_months, 12)
  WHERE org_id = v_org;

  -- -------------------------------------------------------------------------
  -- 2. Vendor assessments — linked to real vendors, carrying an approver and
  --    real evidence references rather than an evidence *count*.
  -- -------------------------------------------------------------------------
  IF v_openai IS NOT NULL THEN
    INSERT INTO public.vendor_assessments
      (org_id, assessment_ref, vendor_id, assessment_type, framework, scope, status,
       score, residual_risk, findings_critical, findings_high, findings_medium, findings_low,
       owner, approver, due_at, submitted_at, reviewed_at, approved_at, next_review_at, recommendation)
    SELECT v_org, 'VA-2026-001', v_openai, 'periodic', 'SIG Lite',
           'Annual review of inference services supporting advisory and copilot use cases.',
           'approved', 86, 'medium', 0, 1, 3, 2,
           'Third-Party Risk Analyst', 'Head of Compliance',
           CURRENT_DATE - 30, now() - interval '38 days', now() - interval '33 days', now() - interval '30 days',
           CURRENT_DATE + 335,
           'Approved. Track the open high finding on subprocessor change notification (30-day SLA requested).'
    WHERE NOT EXISTS (SELECT 1 FROM public.vendor_assessments WHERE org_id = v_org AND assessment_ref = 'VA-2026-001');
  END IF;

  IF v_azure IS NOT NULL THEN
    INSERT INTO public.vendor_assessments
      (org_id, assessment_ref, vendor_id, assessment_type, framework, scope, status,
       score, residual_risk, findings_critical, findings_high, findings_medium, findings_low,
       owner, due_at, recommendation)
    SELECT v_org, 'VA-2026-002', v_azure, 'periodic', 'CAIQ',
           'Reassessment of hosting and vector search; DPA expiry inside 180 days.',
           'in_progress', NULL, NULL, 0, 0, 2, 1,
           'Third-Party Risk Analyst', CURRENT_DATE + 14,
           NULL
    WHERE NOT EXISTS (SELECT 1 FROM public.vendor_assessments WHERE org_id = v_org AND assessment_ref = 'VA-2026-002');
  END IF;

  -- -------------------------------------------------------------------------
  -- 3. Vendor SLAs — NUMERIC targets so breach can actually be evaluated. Note
  --    VSLA-003 has current_value NULL: it has never been measured, and must
  --    render as "—/unmeasured", never as a healthy default.
  -- -------------------------------------------------------------------------
  IF v_openai IS NOT NULL THEN
    INSERT INTO public.vendor_slas
      (org_id, sla_ref, vendor_id, metric, unit, target_value, warning_value, breach_value,
       higher_is_better, current_value, measurement_window, last_measured_at, owner, escalation_path, contract_clause_ref)
    SELECT v_org, 'VSLA-001', v_openai, 'uptime', 'percent', 99.9, 99.7, 99.5,
           true, 99.94, 'monthly', now() - interval '3 days',
           'Head of AI Platform', 'Vendor manager → Head of AI Platform → CTO', 'MSA §7.1 Service Levels'
    WHERE NOT EXISTS (SELECT 1 FROM public.vendor_slas WHERE org_id = v_org AND sla_ref = 'VSLA-001');

    INSERT INTO public.vendor_slas
      (org_id, sla_ref, vendor_id, metric, unit, target_value, warning_value, breach_value,
       higher_is_better, current_value, measurement_window, last_measured_at, last_breach_at,
       consecutive_breaches, owner, service_credits, credit_claim_status, contract_clause_ref)
    SELECT v_org, 'VSLA-002', v_openai, 'response_time', 'ms', 800, 1200, 1500,
           false, 1680, 'rolling_30d', now() - interval '2 days', now() - interval '9 days',
           2, 'Head of AI Platform', '5% of monthly fee per breached month', 'claim_submitted',
           'MSA §7.3 Latency'
    WHERE NOT EXISTS (SELECT 1 FROM public.vendor_slas WHERE org_id = v_org AND sla_ref = 'VSLA-002');
  END IF;

  IF v_anthropic IS NOT NULL THEN
    INSERT INTO public.vendor_slas
      (org_id, sla_ref, vendor_id, metric, unit, target_value, warning_value, breach_value,
       higher_is_better, current_value, measurement_window, owner, contract_clause_ref)
    SELECT v_org, 'VSLA-003', v_anthropic, 'uptime', 'percent', 99.5, 99.3, 99.0,
           true, NULL, 'monthly', 'Head of Compliance', 'MSA §5.2'
    WHERE NOT EXISTS (SELECT 1 FROM public.vendor_slas WHERE org_id = v_org AND sla_ref = 'VSLA-003');
  END IF;

  -- -------------------------------------------------------------------------
  -- 4. Vendor documents. storage_path/file_digest are intentionally NULL: no
  --    file was ever uploaded for a seed row, and inventing a digest is exactly
  --    the defect this rollout removes.
  -- -------------------------------------------------------------------------
  IF v_openai IS NOT NULL THEN
    INSERT INTO public.vendor_documents
      (org_id, document_ref, vendor_id, doc_type, title, file_name,
       valid_from, expires_at, renewal_lead_days, status, confidentiality)
    SELECT v_org, 'VDOC-001', v_openai, 'SOC2', 'SOC 2 Type II report (FY2025)',
           'soc2-type2-fy2025.pdf', CURRENT_DATE - 150, CURRENT_DATE + 210, 60,
           'accepted', 'confidential'
    WHERE NOT EXISTS (SELECT 1 FROM public.vendor_documents WHERE org_id = v_org AND document_ref = 'VDOC-001');
  END IF;

  IF v_azure IS NOT NULL THEN
    INSERT INTO public.vendor_documents
      (org_id, document_ref, vendor_id, doc_type, title, file_name,
       valid_from, expires_at, renewal_lead_days, status, confidentiality)
    SELECT v_org, 'VDOC-002', v_azure, 'DPA', 'Data Processing Agreement',
           'dpa-azure-ai.pdf', CURRENT_DATE - 600, CURRENT_DATE + 130, 90,
           'accepted', 'confidential'
    WHERE NOT EXISTS (SELECT 1 FROM public.vendor_documents WHERE org_id = v_org AND document_ref = 'VDOC-002');
  END IF;

  -- -------------------------------------------------------------------------
  -- 5. AIBOM — keyed to real models. declared_digest is a self-declared value;
  --    verification_status stays 'unverified' because nothing has verified it.
  --    last_scanned_at NULL on AIBOM-002 means "never scanned" and must render
  --    as an em-dash, not as zero CVEs.
  -- -------------------------------------------------------------------------
  IF m_credit IS NOT NULL THEN
    INSERT INTO public.aibom_records
      (org_id, aibom_ref, model_id, model_version, vendor_id, format, spec_version,
       declared_digest, verification_status, status, last_scanned_at, scanner_name, notes)
    SELECT v_org, 'AIBOM-001', m_credit, 'v2.1', v_azure, 'CycloneDX', '1.6',
           'sha256:3f1c8a0c9d2e4b7a6f5e1d0c9b8a7f6e5d4c3b2a1908f7e6d5c4b3a29180706',
           'unverified', 'published', now() - interval '6 days', 'OSV.dev',
           'Self-declared digest supplied by the build pipeline; not independently verified.'
    WHERE NOT EXISTS (SELECT 1 FROM public.aibom_records WHERE org_id = v_org AND aibom_ref = 'AIBOM-001')
    RETURNING id INTO a_credit;

    IF a_credit IS NULL THEN
      SELECT id INTO a_credit FROM public.aibom_records WHERE org_id = v_org AND aibom_ref = 'AIBOM-001' LIMIT 1;
    END IF;

    INSERT INTO public.aibom_components
      (org_id, aibom_id, component_type, name, version, purl, supplier, license_spdx, license_risk, is_direct)
    SELECT v_org, a_credit, x.ctype, x.cname, x.cver, x.purl, x.supplier, x.lic, x.risk, x.direct
    FROM (VALUES
      ('library','scikit-learn','1.4.2','pkg:pypi/scikit-learn@1.4.2','scikit-learn developers','BSD-3-Clause','permissive',true),
      ('library','xgboost','2.0.3','pkg:pypi/xgboost@2.0.3','DMLC','Apache-2.0','permissive',true),
      ('library','pandas','2.2.1','pkg:pypi/pandas@2.2.1','PyData','BSD-3-Clause','permissive',true),
      ('framework','numpy','1.26.4','pkg:pypi/numpy@1.26.4','NumPy developers','BSD-3-Clause','permissive',false)
    ) AS x(ctype,cname,cver,purl,supplier,lic,risk,direct)
    WHERE a_credit IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.aibom_components c WHERE c.aibom_id = a_credit AND c.name = x.cname);

    -- A real CVE row, sourced and dated — replacing a count derived from a
    -- dropdown the user picked.
    INSERT INTO public.aibom_vulnerabilities
      (org_id, aibom_id, component_id, cve_id, cvss_score, severity,
       affected_version_range, fixed_version, source, scanned_at, status)
    SELECT v_org, a_credit, c.id, 'CVE-2024-5206', 5.3, 'medium',
           '<1.5.0', '1.5.0', 'osv.dev', now() - interval '6 days', 'open'
    FROM public.aibom_components c
    WHERE c.aibom_id = a_credit AND c.name = 'scikit-learn'
      AND NOT EXISTS (SELECT 1 FROM public.aibom_vulnerabilities v
                      WHERE v.aibom_id = a_credit AND v.cve_id = 'CVE-2024-5206');
  END IF;

  IF m_fraud IS NOT NULL THEN
    INSERT INTO public.aibom_records
      (org_id, aibom_ref, model_id, model_version, format, spec_version,
       verification_status, status, notes)
    SELECT v_org, 'AIBOM-002', m_fraud, 'v4.2', 'CycloneDX', '1.6',
           'unverified', 'draft',
           'Component inventory drafted; no dependency scan has been run yet.'
    WHERE NOT EXISTS (SELECT 1 FROM public.aibom_records WHERE org_id = v_org AND aibom_ref = 'AIBOM-002')
    RETURNING id INTO a_fraud;
  END IF;

  -- -------------------------------------------------------------------------
  -- 6. Attestations on the REAL table, with a resolvable subject and an honest
  --    verification state. Findings are qualitative statements, not invented
  --    precise metrics ("Equalized odds: 91.2%" was fabricated).
  -- -------------------------------------------------------------------------
  IF m_credit IS NOT NULL THEN
    INSERT INTO public.supply_chain_attestations
      (org_id, name, title, attestation_ref, attestation_type, subject_type, subject_id, model_id,
       scope, findings, attested_by, attestor_org, attestor_is_independent,
       issued_at, valid_until, verification_status, status, review_notes)
    SELECT v_org, 'Bias audit — Credit Risk Scorer', 'Bias audit — Credit Risk Scorer',
           'ATT-001', 'Bias Audit', 'model', m_credit, m_credit,
           'Fairness review across protected attributes for the credit decisioning model.',
           'Reviewed against the approved fairness thresholds. Results recorded in the linked bias audit record.',
           'Independent Assurance Partner', 'External assurance firm', true,
           CURRENT_DATE - 60, CURRENT_DATE + 305, 'unverified', 'active',
           'Self-declared attestation; signature verification not yet implemented.'
    WHERE NOT EXISTS (SELECT 1 FROM public.supply_chain_attestations WHERE org_id = v_org AND attestation_ref = 'ATT-001');
  END IF;

  IF m_fraud IS NOT NULL THEN
    -- Deliberately expired so the derived_validity view has something to prove.
    INSERT INTO public.supply_chain_attestations
      (org_id, name, title, attestation_ref, attestation_type, subject_type, subject_id, model_id,
       scope, attested_by, issued_at, valid_until, verification_status, status)
    SELECT v_org, 'Model integrity attestation — Fraud Detection Engine',
           'Model integrity attestation — Fraud Detection Engine',
           'ATT-002', 'Model Integrity', 'model', m_fraud, m_fraud,
           'Integrity of deployed model artifacts against the approved release.',
           'Head of AI Platform', CURRENT_DATE - 400, CURRENT_DATE - 35, 'unverified', 'active'
    WHERE NOT EXISTS (SELECT 1 FROM public.supply_chain_attestations WHERE org_id = v_org AND attestation_ref = 'ATT-002');
  END IF;

  IF v_openai IS NOT NULL THEN
    INSERT INTO public.supply_chain_attestations
      (org_id, name, title, attestation_ref, attestation_type, subject_type, subject_id, vendor_id,
       scope, attested_by, issued_at, valid_until, verification_status, status)
    SELECT v_org, 'Vendor security review — OpenAI', 'Vendor security review — OpenAI',
           'ATT-003', 'Vendor Security Review', 'vendor', v_openai, v_openai,
           'Annual security posture review supporting the SOC 2 reliance decision.',
           'Third-Party Risk Analyst', CURRENT_DATE - 150, CURRENT_DATE + 210, 'unverified', 'active'
    WHERE NOT EXISTS (SELECT 1 FROM public.supply_chain_attestations WHERE org_id = v_org AND attestation_ref = 'ATT-003');
  END IF;

  -- -------------------------------------------------------------------------
  -- 7. Provenance DAG — depth 3, so the renderer's recursive edge-following is
  --    actually exercised. The previous page held a real adjacency list and
  --    then drew a flat root+children list, hiding exactly this shape.
  -- -------------------------------------------------------------------------
  IF m_credit IS NOT NULL THEN
    INSERT INTO public.provenance_nodes (org_id, node_type, label, model_id, version, verification_status)
    SELECT v_org, 'model', 'Credit Risk Scorer v2.1', m_credit, 'v2.1', 'unverified'
    WHERE NOT EXISTS (SELECT 1 FROM public.provenance_nodes WHERE org_id = v_org AND label = 'Credit Risk Scorer v2.1')
    RETURNING id INTO n_model;
    IF n_model IS NULL THEN
      SELECT id INTO n_model FROM public.provenance_nodes WHERE org_id = v_org AND label = 'Credit Risk Scorer v2.1' LIMIT 1;
    END IF;

    INSERT INTO public.provenance_nodes (org_id, node_type, label, vendor_id, version, verification_status, license_spdx)
    SELECT v_org, 'component', 'XGBoost 2.0.3', NULL, '2.0.3', 'unverified', 'Apache-2.0'
    WHERE NOT EXISTS (SELECT 1 FROM public.provenance_nodes WHERE org_id = v_org AND label = 'XGBoost 2.0.3')
    RETURNING id INTO n_base;
    IF n_base IS NULL THEN
      SELECT id INTO n_base FROM public.provenance_nodes WHERE org_id = v_org AND label = 'XGBoost 2.0.3' LIMIT 1;
    END IF;

    INSERT INTO public.provenance_nodes (org_id, node_type, label, verification_status)
    SELECT v_org, 'dataset', 'Credit history dataset (licensed)', 'unverified'
    WHERE NOT EXISTS (SELECT 1 FROM public.provenance_nodes WHERE org_id = v_org AND label = 'Credit history dataset (licensed)')
    RETURNING id INTO n_data;
    IF n_data IS NULL THEN
      SELECT id INTO n_data FROM public.provenance_nodes WHERE org_id = v_org AND label = 'Credit history dataset (licensed)' LIMIT 1;
    END IF;

    INSERT INTO public.provenance_nodes (org_id, node_type, label, verification_status)
    SELECT v_org, 'pipeline', 'Customer data ETL pipeline', 'unverified'
    WHERE NOT EXISTS (SELECT 1 FROM public.provenance_nodes WHERE org_id = v_org AND label = 'Customer data ETL pipeline')
    RETURNING id INTO n_etl;
    IF n_etl IS NULL THEN
      SELECT id INTO n_etl FROM public.provenance_nodes WHERE org_id = v_org AND label = 'Customer data ETL pipeline' LIMIT 1;
    END IF;

    -- model → component, model → dataset, dataset → pipeline  (the depth-3 leg)
    INSERT INTO public.provenance_edges (org_id, source_node_id, target_node_id, edge_type)
    SELECT v_org, n_model, n_base, 'built_by'
    WHERE n_model IS NOT NULL AND n_base IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.provenance_edges
                      WHERE source_node_id = n_model AND target_node_id = n_base);

    INSERT INTO public.provenance_edges (org_id, source_node_id, target_node_id, edge_type)
    SELECT v_org, n_model, n_data, 'trained_on'
    WHERE n_model IS NOT NULL AND n_data IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.provenance_edges
                      WHERE source_node_id = n_model AND target_node_id = n_data);

    INSERT INTO public.provenance_edges
      (org_id, source_node_id, target_node_id, edge_type,
       source_jurisdiction, target_jurisdiction, transfer_mechanism, pii_categories)
    SELECT v_org, n_data, n_etl, 'derived_from', 'EU', 'US', 'SCC',
           ARRAY['financial','identity']
    WHERE n_data IS NOT NULL AND n_etl IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.provenance_edges
                      WHERE source_node_id = n_data AND target_node_id = n_etl);
  END IF;

  -- -------------------------------------------------------------------------
  -- 8. Carbon records — every figure declares its measurement_method and cites
  --    an emission factor. CR-2026-Q2 is deliberately 'estimated' so the UI's
  --    estimate labelling is exercised.
  -- -------------------------------------------------------------------------
  IF m_credit IS NOT NULL THEN
    INSERT INTO public.carbon_records
      (org_id, name, title, model_id, period, period_start, period_end,
       training_emissions, inference_emissions, total_emissions, net_emissions,
       energy_kwh, renewable_percent, compute_provider, region, gpu_hours, accelerator_type, pue,
       measurement_method, emission_factor_id, ghg_scope, methodology, status)
    SELECT v_org, 'Credit Risk Scorer — 2026-Q1', 'Credit Risk Scorer — 2026-Q1', m_credit,
           '2026-Q1', DATE '2026-01-01', DATE '2026-03-31',
           4.2, 7.8, 12.0, 12.0, 32500, 61, 'Microsoft Azure AI', 'US', 1850, 'NVIDIA A100', 1.18,
           'calculated', ef_us, 'scope_2_market',
           'Energy drawn from provider billing telemetry; emissions calculated with the cited grid factor.',
           'active'
    WHERE NOT EXISTS (SELECT 1 FROM public.carbon_records WHERE org_id = v_org AND name = 'Credit Risk Scorer — 2026-Q1');
  END IF;

  IF m_fraud IS NOT NULL THEN
    INSERT INTO public.carbon_records
      (org_id, name, title, model_id, period, period_start, period_end,
       training_emissions, inference_emissions, total_emissions, net_emissions,
       energy_kwh, renewable_percent, compute_provider, region, gpu_hours, accelerator_type,
       measurement_method, emission_factor_id, ghg_scope, methodology, status)
    SELECT v_org, 'Fraud Detection Engine — 2026-Q2', 'Fraud Detection Engine — 2026-Q2', m_fraud,
           '2026-Q2', DATE '2026-04-01', DATE '2026-06-30',
           1.1, 9.4, 10.5, 10.5, 27400, 74, 'Microsoft Azure AI', 'EU', 1120, 'NVIDIA H100',
           'estimated', ef_eu, 'scope_2_market',
           'GPU-hours estimated from request volume; not measured from provider telemetry.',
           'active'
    WHERE NOT EXISTS (SELECT 1 FROM public.carbon_records WHERE org_id = v_org AND name = 'Fraud Detection Engine — 2026-Q2');
  END IF;

  -- -------------------------------------------------------------------------
  -- 9. Link the existing energy_metrics rows into the one id-space. They were
  --    stranded on a free-text model_name, so no model could reach its own
  --    energy readings.
  -- -------------------------------------------------------------------------
  UPDATE public.energy_metrics SET model_id = m_credit
  WHERE org_id = v_org AND model_id IS NULL AND m_credit IS NOT NULL
    AND model_name ILIKE '%credit%';
  UPDATE public.energy_metrics SET model_id = m_fraud
  WHERE org_id = v_org AND model_id IS NULL AND m_fraud IS NOT NULL
    AND model_name ILIKE '%fraud%';
  UPDATE public.energy_metrics SET model_id = m_loan
  WHERE org_id = v_org AND model_id IS NULL AND m_loan IS NOT NULL
    AND model_name ILIKE '%loan%';
  UPDATE public.energy_metrics SET model_id = m_support
  WHERE org_id = v_org AND model_id IS NULL AND m_support IS NOT NULL
    AND (model_name ILIKE '%support%' OR model_name ILIKE '%copilot%');

  -- -------------------------------------------------------------------------
  -- 10. ESG reports: cite the carbon records they report on, and carry the
  --     assurance/approver fields that separate a disclosure from a draft.
  -- -------------------------------------------------------------------------
  UPDATE public.esg_reports SET
    framework_version = COALESCE(framework_version, 'GRI 2021'),
    assurance_status = COALESCE(assurance_status, 'none'),
    reporting_boundary = COALESCE(reporting_boundary, 'AI systems operated by Acme Financial Services'),
    consolidation_basis = COALESCE(consolidation_basis, 'operational_control'),
    carbon_record_ids = CASE
      WHEN carbon_record_ids = '{}'::uuid[] THEN
        COALESCE(ARRAY(SELECT id FROM public.carbon_records WHERE org_id = v_org AND model_id IS NOT NULL), '{}'::uuid[])
      ELSE carbon_record_ids END,
    model_ids = CASE
      WHEN model_ids = '{}'::uuid[] THEN
        ARRAY(SELECT id FROM public.ai_models WHERE org_id = v_org LIMIT 4)
      ELSE model_ids END
  WHERE org_id = v_org;

EXCEPTION WHEN OTHERS THEN
  -- Seeds must never block a replay: a missing demo org or renamed model makes
  -- this a no-op rather than a failed migration.
  RAISE WARNING 'seed skipped in 20260822000003_seed_tprm_supply_esg.sql: %', SQLERRM;
END $seed$;

-- ---------------------------------------------------------------------------
-- INTERLINK PROOF (per CLAUDE.md gate 1, "total must equal resolves"). Run
-- these after applying; each pair must be equal.
--
--   -- AIBOM → ai_models
--   SELECT count(*) AS total,
--          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM ai_models m WHERE m.id = a.model_id)) AS resolves
--   FROM aibom_records a WHERE a.model_id IS NOT NULL;
--
--   -- Attestations → subject (model or vendor)
--   SELECT count(*) AS total,
--          count(*) FILTER (WHERE
--            (subject_type = 'model'  AND EXISTS (SELECT 1 FROM ai_models m WHERE m.id = subject_id)) OR
--            (subject_type = 'vendor' AND EXISTS (SELECT 1 FROM vendors  v WHERE v.id = subject_id))) AS resolves
--   FROM supply_chain_attestations WHERE subject_id IS NOT NULL;
--
--   -- Vendor assessments / SLAs / documents → vendors
--   SELECT 'assessments' src, count(*) total,
--          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id)) resolves
--   FROM vendor_assessments WHERE vendor_id IS NOT NULL
--   UNION ALL SELECT 'slas', count(*),
--          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id))
--   FROM vendor_slas WHERE vendor_id IS NOT NULL
--   UNION ALL SELECT 'documents', count(*),
--          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM vendors v WHERE v.id = vendor_id))
--   FROM vendor_documents WHERE vendor_id IS NOT NULL;
--
--   -- Carbon / energy → ai_models
--   SELECT 'carbon' src, count(*) total,
--          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM ai_models m WHERE m.id = model_id)) resolves
--   FROM carbon_records WHERE model_id IS NOT NULL
--   UNION ALL SELECT 'energy', count(*),
--          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM ai_models m WHERE m.id = model_id))
--   FROM energy_metrics WHERE model_id IS NOT NULL;
--
--   -- Provenance edges resolve to real nodes on both ends
--   SELECT count(*) AS total,
--          count(*) FILTER (WHERE EXISTS (SELECT 1 FROM provenance_nodes n WHERE n.id = e.source_node_id)
--                             AND EXISTS (SELECT 1 FROM provenance_nodes n WHERE n.id = e.target_node_id)) AS resolves
--   FROM provenance_edges e;
-- ---------------------------------------------------------------------------
