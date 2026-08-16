-- 20260820000006_seed_risk_register_canonical.sql
--
-- Canonical Risk Register seeds (FICTIONAL — see NOTICE). The register had
-- no versioned seed of its own: ws09 rows carry no link arrays, no residual,
-- no KRI, no review cadence, so every interlink panel rendered empty on a
-- fresh replay. Three fully-populated flagship risks (model links, control
-- links, incident links, residual scoring, KRIs, review cadence, one
-- escalated) + link-array backfill for the ws09 bias/drift rows the other
-- groups' seeds already reference. Idempotent (natural-key guards).

DO $rr$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  m_credit uuid; m_fraud uuid; m_support uuid;
  i_bias uuid; i_drift uuid; i_pii uuid;
  c_bias text; c_drift text;
BEGIN
  SELECT id INTO m_credit  FROM public.ai_models WHERE org_id = v_org AND name = 'Credit Risk Scorer'       LIMIT 1;
  SELECT id INTO m_fraud   FROM public.ai_models WHERE org_id = v_org AND name = 'Fraud Detection Engine'   LIMIT 1;
  SELECT id INTO m_support FROM public.ai_models WHERE org_id = v_org AND name = 'Customer Support Copilot' LIMIT 1;
  SELECT id INTO i_bias  FROM public.incidents WHERE tenant_id = v_org::text AND incident_id = 'INC-2026-602' LIMIT 1;
  SELECT id INTO i_drift FROM public.incidents WHERE tenant_id = v_org::text AND incident_id = 'INC-2026-601' LIMIT 1;
  SELECT id INTO i_pii   FROM public.incidents WHERE tenant_id = v_org::text AND incident_id = 'INC-2026-603' LIMIT 1;
  SELECT id::text INTO c_bias  FROM public.controls WHERE tenant_id = v_org::text AND (name ILIKE '%bias%' OR title ILIKE '%bias%') LIMIT 1;
  SELECT id::text INTO c_drift FROM public.controls WHERE tenant_id = v_org::text AND (name ILIKE '%drift%' OR title ILIKE '%monitor%') LIMIT 1;

  IF NOT EXISTS (SELECT 1 FROM public.risks WHERE tenant_id = v_org::text AND risk_id = 'RSK-2026-001') THEN
    INSERT INTO public.risks
      (org_id, tenant_id, risk_id, title, name, description, category, categories, status,
       mitigation_status, likelihood, impact, severity, risk_score, owner, treatment,
       residual_likelihood, residual_impact, residual_score,
       review_frequency, last_reviewed_date, next_review_date, deadline,
       is_escalated, escalation_reason, kri_metric, kri_threshold, kri_current_value,
       linked_model_ids, linked_control_ids, linked_incident_ids,
       applicable_frameworks, mitigation_plan, source)
    VALUES
      (v_org, v_org::text, 'RSK-2026-001',
       'Discriminatory lending outcomes from automated credit scoring',
       'Discriminatory lending outcomes from automated credit scoring',
       'Geographic and demographic disparity in automated approvals produces fair-lending exposure with supervisory and restitution consequences.',
       'AI Bias & Fairness', ARRAY['AI Bias & Fairness'], 'open', 'in_progress',
       4, 5, 5, 20, 'Fair-lending Officer', 'mitigate',
       2, 4, 8,
       'monthly', CURRENT_DATE - 12, CURRENT_DATE + 18, CURRENT_DATE + 45,
       true, 'Active fair-lending incident INC-2026-602; automated decisioning suspended for the affected segment.',
       'Approval-rate disparity (pp)', 5, 11.8,
       CASE WHEN m_credit IS NULL THEN '{}' ELSE ARRAY[m_credit::text] END,
       CASE WHEN c_bias IS NULL THEN '{}' ELSE ARRAY[c_bias] END,
       CASE WHEN i_bias IS NULL THEN '{}'::uuid[] ELSE ARRAY[i_bias] END,
       ARRAY['EU AI Act Art. 10','ISO 42001 8.2','ECOA Reg B'],
       'Fairness-constrained retraining plus segment-level human review until the disparity KRI is inside threshold for two consecutive months.',
       'bias_monitor'),
      (v_org, v_org::text, 'RSK-2026-002',
       'Fraud model degradation during remittance surges',
       'Fraud model degradation during remittance surges',
       'Seasonal distribution shift on remittance corridors elevates false negatives and fraud losses during festival windows.',
       'Model Performance', ARRAY['Model Performance'], 'open', 'in_progress',
       4, 4, 4, 16, 'Fraud Analytics Lead', 'mitigate',
       2, 3, 6,
       'monthly', CURRENT_DATE - 20, CURRENT_DATE + 10, CURRENT_DATE + 30,
       false, NULL,
       'PSI (remittance features)', 0.25, 0.32,
       CASE WHEN m_fraud IS NULL THEN '{}' ELSE ARRAY[m_fraud::text] END,
       CASE WHEN c_drift IS NULL THEN '{}' ELSE ARRAY[c_drift] END,
       CASE WHEN i_drift IS NULL THEN '{}'::uuid[] ELSE ARRAY[i_drift] END,
       ARRAY['EU AI Act Art. 9','ISO 42001 8.3'],
       'Seasonal covariates in retraining plus drift-triggered deployment holds (AUTO-002).',
       'drift_detection'),
      (v_org, v_org::text, 'RSK-2026-003',
       'Sensitive data exposure through conversational AI',
       'Sensitive data exposure through conversational AI',
       'Prompt-injection or context-carryover in the support copilot could disclose customer PII; guardrails held in the last probe.',
       'Data Protection', ARRAY['Data Protection'], 'assessed', 'in_progress',
       3, 5, 5, 15, 'Privacy Officer', 'mitigate',
       1, 5, 5,
       'quarterly', CURRENT_DATE - 40, CURRENT_DATE + 50, NULL,
       false, NULL,
       'Guardrail PII block events (30d)', 10, 4,
       CASE WHEN m_support IS NULL THEN '{}' ELSE ARRAY[m_support::text] END,
       '{}',
       CASE WHEN i_pii IS NULL THEN '{}'::uuid[] ELSE ARRAY[i_pii] END,
       ARRAY['GDPR Art. 32','EU AI Act Art. 15'],
       'Block-mode PII redaction, canary identifiers in eval sets, and quarterly privacy red-team scenarios.',
       'guardrail_events');
  END IF;

  -- Backfill link arrays on the ws09-era rows the other groups already point
  -- at (r_bias / r_drift resolutions in 20260819000002 used title patterns).
  UPDATE public.risks SET
    linked_model_ids = CASE WHEN m_credit IS NULL THEN linked_model_ids ELSE ARRAY[m_credit::text] END,
    linked_incident_ids = CASE WHEN i_bias IS NULL THEN linked_incident_ids ELSE ARRAY[i_bias] END
  WHERE tenant_id = v_org::text AND title ILIKE '%bias%' AND risk_id IS DISTINCT FROM 'RSK-2026-001'
    AND (linked_model_ids IS NULL OR cardinality(linked_model_ids) = 0);
  UPDATE public.risks SET
    linked_model_ids = CASE WHEN m_fraud IS NULL THEN linked_model_ids ELSE ARRAY[m_fraud::text] END,
    linked_incident_ids = CASE WHEN i_drift IS NULL THEN linked_incident_ids ELSE ARRAY[i_drift] END
  WHERE tenant_id = v_org::text AND title ILIKE '%drift%' AND risk_id IS DISTINCT FROM 'RSK-2026-002'
    AND (linked_model_ids IS NULL OR cardinality(linked_model_ids) = 0);

  -- Cross-link the seeded audit finding to the flagship bias risk (the
  -- linked_risk_id column landed in 20260820000005).
  UPDATE public.audit_findings SET linked_risk_id = (
    SELECT id FROM public.risks WHERE tenant_id = v_org::text AND risk_id = 'RSK-2026-001' LIMIT 1
  ) WHERE org_id = v_org AND finding_ref = 'AF-007' AND linked_risk_id IS NULL;
END $rr$;
