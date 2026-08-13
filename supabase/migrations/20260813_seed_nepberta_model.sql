-- Register a real Nepal-based AI model in the Model Registry (ai_models) for the
-- demo org: NepBERTa, a BERT language model pre-trained on a large Nepali corpus
-- for Nepali NLP (NER, classification, QA); published at AACL-IJCNLP 2022.
-- Constraint-valid enums + idempotent (NOT EXISTS on name). Applied via Supabase MCP.
INSERT INTO public.ai_models
  (org_id, name, slug, model_type, provider, version, lifecycle_stage, risk_tier,
   risk_score, trust_score, business_owner, technical_owner, framework,
   fairness_score, drift_status, use_case, eu_ai_act_category, is_regulated,
   description, tags, metadata)
SELECT
  '00000000-0000-0000-0000-000000000001'::uuid,'NepBERTa','nepberta','nlp',
  'Nepali NLP Research (NAAMII / KU)','v1.0','production','minimal',
  20,86,'Language AI Team','Sulav Timilsina','Transformers (BERT)',
  90,'stable','Nepali language understanding — NER, classification, QA','minimal_risk',false,
  'NepBERTa is a BERT-based language model pre-trained on a large Nepali text corpus (~0.8B tokens) for Nepali natural-language tasks. Published at AACL-IJCNLP 2022.',
  ARRAY['nepali','nlp','bert','low-resource-language','open-source'],
  '{"country":"Nepal","origin":"Nepal","paper":"NepBERTa: Nepali Language Model Trained in a Large Corpus (AACL-IJCNLP 2022)","license":"open"}'::jsonb
WHERE NOT EXISTS (
  SELECT 1 FROM public.ai_models m
  WHERE m.org_id='00000000-0000-0000-0000-000000000001' AND m.name='NepBERTa'
);
