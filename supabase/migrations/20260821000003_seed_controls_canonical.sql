-- 20260821000003_seed_controls_canonical.sql
--
-- Canonical controls seed (2026-08-16 compliance re-audit; FICTIONAL
-- Nepali-bank narrative consistent with the existing seeds — see NOTICE).
--
-- Why: `controls` is EMPTY after a from-zero replay — the only historical
-- seed (20260421000020 ws09 Acme rows) is fault-tolerantly skipped because it
-- predates the NOT NULL name column. That leaves the risk<->control,
-- finding<->control and evidence<->control interlink graph vacuous: the
-- 20260820000006 risk seeds look controls up by name (ILIKE '%bias%' /
-- '%drift%') and resolved nothing, AF-007 has no linked control, and the
-- evidence library's dormant control_id slugs point nowhere. This file seeds
-- 14 canonical controls for the demo org across ISO/IEC 42001, the EU AI Act
-- (Art. 9/10/12/14/15/73) and NRB model-risk directives, then backfills the
-- interlinks that were waiting on them. Natural-key guards throughout.

DO $ctl$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  m_credit text; m_fraud text; m_kyc text; m_loan text; m_support text;
  p_lit text; p_ext text; p_mrm text;
  r_bias uuid; r_drift uuid; r_pii uuid;
  c_bias uuid; c_drift uuid; c_oversight uuid; c_llm uuid; c_lineage uuid;
  c_lifecycle uuid; c_board uuid; c_incident uuid;
  af7 uuid;
BEGIN
  SELECT id::text INTO m_credit  FROM public.ai_models WHERE org_id = v_org AND name = 'Credit Risk Scorer'       LIMIT 1;
  SELECT id::text INTO m_fraud   FROM public.ai_models WHERE org_id = v_org AND name = 'Fraud Detection Engine'   LIMIT 1;
  SELECT id::text INTO m_kyc     FROM public.ai_models WHERE org_id = v_org AND name = 'KYC Image Classifier'     LIMIT 1;
  SELECT id::text INTO m_loan    FROM public.ai_models WHERE org_id = v_org AND name = 'Loan Approval Assistant'  LIMIT 1;
  SELECT id::text INTO m_support FROM public.ai_models WHERE org_id = v_org AND name = 'Customer Support Copilot' LIMIT 1;
  SELECT id::text INTO p_lit FROM public.policies WHERE org_id = v_org AND title = 'AI Literacy & Competence Policy'         LIMIT 1;
  SELECT id::text INTO p_ext FROM public.policies WHERE org_id = v_org AND title = 'External AI Tools Acceptable Use Policy' LIMIT 1;
  SELECT id::text INTO p_mrm FROM public.policies WHERE org_id = v_org AND title = 'AI Model Risk Management Policy'         LIMIT 1;
  SELECT id INTO r_bias  FROM public.risks WHERE tenant_id = v_org::text AND risk_id = 'RSK-2026-001' LIMIT 1;
  SELECT id INTO r_drift FROM public.risks WHERE tenant_id = v_org::text AND risk_id = 'RSK-2026-002' LIMIT 1;
  SELECT id INTO r_pii   FROM public.risks WHERE tenant_id = v_org::text AND risk_id = 'RSK-2026-003' LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM public.controls WHERE tenant_id = v_org::text AND control_ref = 'CTL-001') THEN
    INSERT INTO public.controls
      (org_id, tenant_id, control_ref, control_id, name, title, description,
       framework, clause_ref, category, status, implementation_status,
       test_frequency, last_tested_at, next_test_at, owner,
       linked_model_ids, linked_policy_ids, linked_risk_ids)
    VALUES
      (v_org, v_org::text, 'CTL-001', 'CTL-001',
       'AI risk assessment and treatment cadence', 'AI risk assessment and treatment cadence',
       'Every production model family carries a risk assessment reviewed on the register cadence; treatments are tracked to closure in the risk register.',
       'ISO/IEC 42001', 'A.5.2 / Clause 6.1', 'governance', 'implemented', 'implemented',
       'quarterly', now() - interval '35 days', now() + interval '55 days', 'Head of Model Risk',
       array_remove(ARRAY[m_credit, m_fraud, m_kyc, m_loan], NULL),
       array_remove(ARRAY[p_mrm], NULL), NULL),

      (v_org, v_org::text, 'CTL-002', 'CTL-002',
       'Bias monitoring thresholds', 'Bias monitoring thresholds',
       'Approval-rate disparity and demographic-parity thresholds on the credit models, alerting the fair-lending officer on breach. Thresholds pending formal risk-committee approval (AF-007).',
       'EU AI Act', 'Art. 10 / ISO 42001 A.7.4', 'fairness', 'in_progress', 'in_progress',
       'monthly', now() - interval '48 days', now() - interval '17 days', 'Fair-lending Officer',
       array_remove(ARRAY[m_credit, m_loan], NULL),
       array_remove(ARRAY[p_mrm], NULL),
       CASE WHEN r_bias IS NULL THEN NULL ELSE ARRAY[r_bias::text] END),

      (v_org, v_org::text, 'CTL-003', 'CTL-003',
       'Model drift monitoring', 'Model drift monitoring',
       'PSI and performance drift monitors on scoring features with deployment holds on breach; tuned for remittance-corridor seasonality (Dashain/Tihar surges).',
       'EU AI Act', 'Art. 9 / ISO 42001 A.6.2.6', 'performance', 'effective', 'effective',
       'monthly', now() - interval '9 days', now() + interval '21 days', 'Fraud Analytics Lead',
       array_remove(ARRAY[m_fraud, m_credit], NULL), NULL,
       CASE WHEN r_drift IS NULL THEN NULL ELSE ARRAY[r_drift::text] END),

      (v_org, v_org::text, 'CTL-004', 'CTL-004',
       'Human oversight gates for adverse decisions', 'Human oversight gates for adverse decisions',
       'Declined credit applications and fraud holds above threshold route to a designated human reviewer with override authority before the decision is final.',
       'EU AI Act', 'Art. 14 / ISO 42001 A.9.2', 'oversight', 'implemented', 'implemented',
       'quarterly', now() - interval '20 days', now() + interval '70 days', 'CRO office',
       array_remove(ARRAY[m_credit, m_loan], NULL), NULL, NULL),

      (v_org, v_org::text, 'CTL-005', 'CTL-005',
       'Decision logging and traceability', 'Decision logging and traceability',
       'Automated decisions, oversight actions and model lifecycle events are logged append-only and retained per the records schedule.',
       'EU AI Act', 'Art. 12 / NRB IT Guidelines 7.2', 'records', 'effective', 'effective',
       'monthly', now() - interval '12 days', now() + interval '18 days', 'Chief Compliance Officer',
       array_remove(ARRAY[m_credit, m_fraud, m_kyc, m_loan, m_support], NULL), NULL, NULL),

      (v_org, v_org::text, 'CTL-006', 'CTL-006',
       'Adversarial robustness testing', 'Adversarial robustness testing',
       'Quarterly adversarial evaluation of the KYC image classifier and fraud engine (perturbation, evasion and replay suites) with release gates on regression.',
       'EU AI Act', 'Art. 15', 'security', 'in_progress', 'in_progress',
       'quarterly', now() - interval '120 days', now() - interval '25 days', 'MLOps Lead',
       array_remove(ARRAY[m_kyc, m_fraud], NULL), NULL, NULL),

      (v_org, v_org::text, 'CTL-007', 'CTL-007',
       'LLM guardrails and PII redaction', 'LLM guardrails and PII redaction',
       'Block-mode PII redaction, prompt-injection screens and canary identifiers on the support copilot; guardrail events reviewed weekly.',
       'ISO/IEC 42001', 'A.6.2.4 / EU AI Act Art. 15', 'privacy', 'implemented', 'implemented',
       'monthly', now() - interval '6 days', now() + interval '24 days', 'Privacy Officer',
       array_remove(ARRAY[m_support], NULL),
       array_remove(ARRAY[p_ext], NULL),
       CASE WHEN r_pii IS NULL THEN NULL ELSE ARRAY[r_pii::text] END),

      (v_org, v_org::text, 'CTL-008', 'CTL-008',
       'Training data governance and lineage', 'Training data governance and lineage',
       'Documented provenance, representativeness checks and lineage maps for training datasets feeding the credit and fraud model families.',
       'ISO/IEC 42001', 'A.7.2', 'data', 'implemented', 'implemented',
       'semiannual', now() - interval '80 days', now() + interval '100 days', 'Data Science Lead',
       array_remove(ARRAY[m_fraud, m_credit], NULL), NULL, NULL),

      (v_org, v_org::text, 'CTL-009', 'CTL-009',
       'AI lifecycle stage gates', 'AI lifecycle stage gates',
       'Development-to-retirement stage gates: validation sign-off, deployment approval, rollback drills and retirement review for every model family.',
       'ISO/IEC 42001', 'A.6.1.2', 'lifecycle', 'effective', 'effective',
       'annual', now() - interval '95 days', now() + interval '270 days', 'Head of Model Risk',
       array_remove(ARRAY[m_credit, m_fraud, m_kyc], NULL),
       array_remove(ARRAY[p_mrm], NULL), NULL),

      (v_org, v_org::text, 'CTL-010', 'CTL-010',
       'AI policy board approval and review', 'AI policy board approval and review',
       'AI governance policies are approved by the board risk committee and re-reviewed annually; approvals are recorded with the signing minutes.',
       'ISO/IEC 42001', 'Clause 5.2 / A.2.2', 'governance', 'implemented', 'implemented',
       'annual', now() - interval '150 days', now() + interval '215 days', 'Chief Compliance Officer',
       NULL, array_remove(ARRAY[p_mrm, p_lit, p_ext], NULL), NULL),

      (v_org, v_org::text, 'CTL-011', 'CTL-011',
       'Serious incident reporting to regulator', 'Serious incident reporting to regulator',
       'Reportable AI incidents are notified to the supervisor within the deadline with an approved narrative; annual dry-run of the notification path (AF-008).',
       'EU AI Act', 'Art. 73 / NRB IT Guidelines 6.4', 'incident', 'implemented', 'implemented',
       'semiannual', now() - interval '200 days', now() - interval '10 days', 'Chief Compliance Officer',
       array_remove(ARRAY[m_credit, m_fraud], NULL), NULL, NULL),

      (v_org, v_org::text, 'CTL-012', 'CTL-012',
       'NRB model risk directive validation', 'NRB model risk directive validation',
       'Independent validation of credit and fraud models against the NRB model-risk expectations before material changes go live.',
       'NRB Directives', 'Model Risk Directive 2078 §4', 'regulatory', 'planned', 'planned',
       'annual', NULL, now() + interval '60 days', 'Internal Audit',
       array_remove(ARRAY[m_credit, m_fraud], NULL), NULL, NULL),

      (v_org, v_org::text, 'CTL-013', 'CTL-013',
       'AI literacy training coverage', 'AI literacy training coverage',
       'All staff who build, operate or rely on AI systems complete role-appropriate literacy training; coverage tracked against the training register.',
       'ISO/IEC 42001', 'A.4.4 / EU AI Act Art. 4', 'people', 'in_progress', 'in_progress',
       'quarterly', now() - interval '30 days', now() + interval '40 days', 'Learning & Development Lead',
       NULL, array_remove(ARRAY[p_lit], NULL), NULL),

      (v_org, v_org::text, 'CTL-014', 'CTL-014',
       'On-device biometric model controls', 'On-device biometric model controls',
       'Controls for on-device biometric inference. Not applicable: the bank runs no on-device biometric models; KYC image checks are server-side (CTL-006).',
       'EU AI Act', 'Art. 15', 'security', 'not_applicable', 'not_applicable',
       NULL, NULL, NULL, 'Head of Model Risk',
       NULL, NULL, NULL);
  END IF;

  -- Resolve the freshly-seeded (or pre-existing) controls for the backfills.
  SELECT id INTO c_bias      FROM public.controls WHERE tenant_id = v_org::text AND control_ref = 'CTL-002' LIMIT 1;
  SELECT id INTO c_drift     FROM public.controls WHERE tenant_id = v_org::text AND control_ref = 'CTL-003' LIMIT 1;
  SELECT id INTO c_oversight FROM public.controls WHERE tenant_id = v_org::text AND control_ref = 'CTL-004' LIMIT 1;
  SELECT id INTO c_llm       FROM public.controls WHERE tenant_id = v_org::text AND control_ref = 'CTL-007' LIMIT 1;
  SELECT id INTO c_lineage   FROM public.controls WHERE tenant_id = v_org::text AND control_ref = 'CTL-008' LIMIT 1;
  SELECT id INTO c_lifecycle FROM public.controls WHERE tenant_id = v_org::text AND control_ref = 'CTL-009' LIMIT 1;
  SELECT id INTO c_board     FROM public.controls WHERE tenant_id = v_org::text AND control_ref = 'CTL-010' LIMIT 1;
  SELECT id INTO c_incident  FROM public.controls WHERE tenant_id = v_org::text AND control_ref = 'CTL-011' LIMIT 1;

  -- -------------------------------------------------------------------------
  -- Backfill 1: risks.linked_control_ids for the flagship register rows.
  -- Re-runs the name lookups 20260820000006 attempted (they resolved nothing
  -- because controls was empty); only touches rows still empty.
  -- -------------------------------------------------------------------------
  UPDATE public.risks SET linked_control_ids = ARRAY[c_bias::text]
  WHERE tenant_id = v_org::text AND risk_id = 'RSK-2026-001'
    AND c_bias IS NOT NULL
    AND (linked_control_ids IS NULL OR cardinality(linked_control_ids) = 0);
  UPDATE public.risks SET linked_control_ids = ARRAY[c_drift::text]
  WHERE tenant_id = v_org::text AND risk_id = 'RSK-2026-002'
    AND c_drift IS NOT NULL
    AND (linked_control_ids IS NULL OR cardinality(linked_control_ids) = 0);
  UPDATE public.risks SET linked_control_ids = ARRAY[c_llm::text]
  WHERE tenant_id = v_org::text AND risk_id = 'RSK-2026-003'
    AND c_llm IS NOT NULL
    AND (linked_control_ids IS NULL OR cardinality(linked_control_ids) = 0);

  -- -------------------------------------------------------------------------
  -- Backfill 2: AF-007 ("Bias monitoring thresholds not formally approved")
  -- gains its control interlink — the finding is literally ABOUT CTL-002.
  -- -------------------------------------------------------------------------
  UPDATE public.audit_findings SET linked_control_id = c_bias::text
  WHERE org_id = v_org AND finding_ref = 'AF-007'
    AND c_bias IS NOT NULL AND linked_control_id IS NULL;

  -- -------------------------------------------------------------------------
  -- Backfill 3: evidence.linked_controls from the dormant legacy slug column
  -- evidence.control_id, where a sensible canonical control exists. Slugs
  -- with no seeded counterpart (gdpr-art35, soc2-cc6, nist-csf-*) stay
  -- unmapped rather than being force-fit.
  -- -------------------------------------------------------------------------
  UPDATE public.evidence e SET linked_controls = ARRAY[map.cid::text]
  FROM (VALUES
    ('eu-ai-act-art10',    c_bias),
    ('eu-ai-act-art14',    c_oversight),
    ('eu-ai-act-art73',    c_incident),
    ('iso-42001-annex-a4', c_board),
    ('iso-42001-annex-a6', c_lifecycle),
    ('iso-42001-annex-a8', c_lineage)
  ) AS map(slug, cid)
  WHERE e.tenant_id = v_org::text
    AND e.control_id = map.slug
    AND map.cid IS NOT NULL
    AND (e.linked_controls IS NULL OR cardinality(e.linked_controls) = 0);

  -- -------------------------------------------------------------------------
  -- Backfill 4: the legacy remediation plan REM-2026-001 ("Credit Scoring
  -- Bias Remediation Plan") carried the phantom source 'bias_audit/bias-001'.
  -- 20260820000002's header notes the findings seed exists so remediation
  -- sources resolve — point it at AF-007, the bias-threshold finding it
  -- remediates. Only rewrites the known-bad value.
  -- -------------------------------------------------------------------------
  SELECT id INTO af7 FROM public.audit_findings WHERE org_id = v_org AND finding_ref = 'AF-007' LIMIT 1;
  UPDATE public.remediation_plans
  SET source_type = 'audit_finding', source_id = af7::text
  WHERE org_id = v_org AND plan_ref = 'REM-2026-001'
    AND af7 IS NOT NULL
    AND source_type = 'bias_audit' AND source_id = 'bias-001';
END $ctl$;

-- Verification (run in replay after apply; every total must equal resolves):
--
-- SELECT 'risks->controls' AS chk,
--        count(*) AS total,
--        count(*) FILTER (WHERE resolved) AS resolves
-- FROM (
--   SELECT r.risk_id,
--          bool_and(EXISTS (SELECT 1 FROM controls c WHERE c.id::text = l)) AS resolved
--   FROM risks r CROSS JOIN LATERAL unnest(r.linked_control_ids) l
--   WHERE r.risk_id IN ('RSK-2026-001','RSK-2026-002','RSK-2026-003')
--   GROUP BY r.risk_id
-- ) s;
--
-- SELECT 'AF-007->control' AS chk, count(*) AS total,
--        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM controls c WHERE c.id::text = f.linked_control_id)) AS resolves
-- FROM audit_findings f WHERE f.finding_ref = 'AF-007';
--
-- SELECT 'evidence->controls' AS chk, count(*) AS total,
--        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM controls c WHERE c.id::text = l)) AS resolves
-- FROM evidence e CROSS JOIN LATERAL unnest(e.linked_controls) l;
--
-- SELECT 'REM-2026-001->AF-007' AS chk, count(*) AS total,
--        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM audit_findings f WHERE f.id::text = rp.source_id)) AS resolves
-- FROM remediation_plans rp WHERE rp.plan_ref = 'REM-2026-001';
