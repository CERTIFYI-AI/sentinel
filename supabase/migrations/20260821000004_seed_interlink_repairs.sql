-- 20260821000004_seed_interlink_repairs.sql
--
-- Seed interlink repairs (2026-08-16 compliance re-audit).
--
-- Why: three seed families violate the platform's one-id-space rule — they
-- store slugs or phantom uuids where ai_models.id / vendors.id belong, so
-- the interlink panels resolve 0/N and render "Unavailable" for records that
-- DO exist. Each repair resolves the real id by name at apply time and only
-- rewrites the known-bad value, so the file is idempotent and never clobbers
-- a live fix.

DO $ilr$
DECLARE
  v_org uuid := '00000000-0000-0000-0000-000000000001';
  m_credit uuid; m_fraud uuid; m_loan uuid; m_support uuid;
  v_openai uuid; v_anthropic uuid; v_msazure uuid;
BEGIN
  SELECT id INTO m_credit  FROM public.ai_models WHERE org_id = v_org AND name = 'Credit Risk Scorer'       LIMIT 1;
  SELECT id INTO m_fraud   FROM public.ai_models WHERE org_id = v_org AND name = 'Fraud Detection Engine'   LIMIT 1;
  SELECT id INTO m_loan    FROM public.ai_models WHERE org_id = v_org AND name = 'Loan Approval Assistant'  LIMIT 1;
  SELECT id INTO m_support FROM public.ai_models WHERE org_id = v_org AND name = 'Customer Support Copilot' LIMIT 1;

  -- -------------------------------------------------------------------------
  -- 4a. conformity_assessments.model_id carried marketing slugs instead of
  --     ai_models uuids (re-audit: 3 of 4 assessments resolved no model, so
  --     the assessment cards showed "Unavailable" and the model detail pages
  --     never listed their own conformity assessments).
  -- -------------------------------------------------------------------------
  UPDATE public.conformity_assessments SET model_id = m_loan::text
  WHERE org_id = v_org AND model_id = 'mortgage-approval-model' AND m_loan IS NOT NULL;
  UPDATE public.conformity_assessments SET model_id = m_credit::text
  WHERE org_id = v_org AND model_id = 'credit-scoring-v3.2.1' AND m_credit IS NOT NULL;
  UPDATE public.conformity_assessments SET model_id = m_fraud::text
  WHERE org_id = v_org AND model_id = 'fraud-detection-v2.8' AND m_fraud IS NOT NULL;

  -- -------------------------------------------------------------------------
  -- 4b. ai_trainings.linked_model_ids carried phantom uuids (no such rows in
  --     ai_models). The training descriptions name the real models: TRN-002
  --     is about the Credit Risk Scorer, TRN-003 about the Fraud Detection
  --     Engine, TRN-004 about the Customer Support Copilot (see the seed at
  --     20260816000002_govern_addons_foundation.sql). Keyed on training_ref
  --     and only replacing the known-phantom value.
  -- -------------------------------------------------------------------------
  UPDATE public.ai_trainings SET linked_model_ids = ARRAY[m_credit]
  WHERE org_id = v_org AND training_ref = 'TRN-2026-002' AND m_credit IS NOT NULL
    AND linked_model_ids = ARRAY['83a20820-aa10-4216-8ad6-80e4261071cf']::uuid[];
  UPDATE public.ai_trainings SET linked_model_ids = ARRAY[m_fraud]
  WHERE org_id = v_org AND training_ref = 'TRN-2026-003' AND m_fraud IS NOT NULL
    AND linked_model_ids = ARRAY['e61f991b-7da7-4b81-9deb-aa8665bb6ac1']::uuid[];
  UPDATE public.ai_trainings SET linked_model_ids = ARRAY[m_support]
  WHERE org_id = v_org AND training_ref = 'TRN-2026-004' AND m_support IS NOT NULL
    AND linked_model_ids = ARRAY['bd167875-01d2-4afb-aa11-b25b6dbd4d09']::uuid[];

  -- -------------------------------------------------------------------------
  -- 4c. trust_center_config.doc.subprocessors.vendorIds carried the phantom
  --     slugs vendor-001/002/003, so the public trust page resolved zero
  --     subprocessors. The ai_apps seed shows what those slugs meant
  --     (vendor-001 = ChatGPT Enterprise, vendor-002 = Claude for Work,
  --     vendor-003 = GitHub Copilot), so map them to the seeded vendors
  --     OpenAI, Anthropic and Microsoft Azure AI, resolved by name. Only the
  --     known-bad array is replaced.
  -- -------------------------------------------------------------------------
  SELECT id INTO v_openai    FROM public.vendors WHERE org_id = v_org AND name = 'OpenAI'             LIMIT 1;
  SELECT id INTO v_anthropic FROM public.vendors WHERE org_id = v_org AND name = 'Anthropic'          LIMIT 1;
  SELECT id INTO v_msazure   FROM public.vendors WHERE org_id = v_org AND name = 'Microsoft Azure AI' LIMIT 1;

  IF v_openai IS NOT NULL AND v_anthropic IS NOT NULL AND v_msazure IS NOT NULL THEN
    UPDATE public.trust_center_config
    SET doc = jsonb_set(doc, '{subprocessors,vendorIds}',
                        jsonb_build_array(v_openai::text, v_anthropic::text, v_msazure::text)),
        updated_at = now()
    WHERE org_id = v_org
      AND doc->'subprocessors'->'vendorIds' = '["vendor-001","vendor-002","vendor-003"]'::jsonb;
  END IF;
END $ilr$;

-- Verification (run in replay after apply; every total must equal resolves):
--
-- SELECT 'conformity->model' AS chk, count(*) AS total,
--        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM ai_models m WHERE m.id::text = ca.model_id)) AS resolves
-- FROM conformity_assessments ca WHERE ca.model_id IS NOT NULL;
--
-- SELECT 'trainings->models' AS chk, count(*) AS total,
--        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM ai_models m WHERE m.id = l)) AS resolves
-- FROM ai_trainings t CROSS JOIN LATERAL unnest(t.linked_model_ids) l;
--
-- SELECT 'trust->vendors' AS chk, count(*) AS total,
--        count(*) FILTER (WHERE EXISTS (SELECT 1 FROM vendors v WHERE v.id::text = vid)) AS resolves
-- FROM trust_center_config tc
-- CROSS JOIN LATERAL jsonb_array_elements_text(tc.doc->'subprocessors'->'vendorIds') vid;
