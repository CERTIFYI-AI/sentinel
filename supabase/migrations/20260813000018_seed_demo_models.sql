-- Demo seed: register a handful of governed models for the default demo org
-- (Sentinel Financial Corp, 00000000-0000-0000-0000-000000000001) so the wired
-- Model Registry shows live, RLS-scoped data for the demo accounts. Idempotent
-- (guarded by NOT EXISTS on name) and constraint-valid (model_type / risk_tier /
-- eu_ai_act_category use the ai_models CHECK enums). Applied via Supabase MCP.
INSERT INTO public.ai_models
  (org_id, name, slug, model_type, provider, version, lifecycle_stage, risk_tier,
   risk_score, trust_score, business_owner, technical_owner, framework,
   fairness_score, drift_status, use_case, eu_ai_act_category, is_regulated)
SELECT * FROM (VALUES
  ('00000000-0000-0000-0000-000000000001'::uuid,'Credit Risk Scorer','credit-risk-scorer-v3','classification','Internal','v3.2.1','production','high',72,68,'Maria Santos','Raj Mehta','EU AI Act',74,'warning','Consumer credit scoring','high_risk',true),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Fraud Detection Engine','fraud-detection-engine-v2','other','Internal','v2.1.0','production','high',40,88,'David Kim','Sara Cohen','EU AI Act',91,'stable','Transaction fraud monitoring','high_risk',true),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Churn Predictor','churn-predictor-v1','classification','Internal','v1.1.0','staging','medium',30,82,'Maria Santos','Raj Mehta','EU AI Act',88,'stable','Customer retention','limited_risk',false),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Loan Approval Assistant','loan-approval-assistant-v4','llm','OpenAI','v4.0.0','production','high',65,79,'Priya Patel','Tom Weber','EU AI Act',82,'stable','Loan underwriting support','high_risk',true),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Document Classifier','document-classifier-v1','classification','Internal','v1.5.2','development','minimal',15,90,'Alex Rivera','Sara Cohen','EU AI Act',95,'stable','Back-office document routing','minimal_risk',false),
  ('00000000-0000-0000-0000-000000000001'::uuid,'Customer Support Copilot','customer-support-copilot-v2','llm','Anthropic','v2.3.0','production','medium',35,85,'Jordan Lee','Tom Weber','EU AI Act',87,'warning','Support agent assist','limited_risk',false)
) AS v(org_id,name,slug,model_type,provider,version,lifecycle_stage,risk_tier,risk_score,trust_score,business_owner,technical_owner,framework,fairness_score,drift_status,use_case,eu_ai_act_category,is_regulated)
WHERE NOT EXISTS (SELECT 1 FROM public.ai_models m WHERE m.org_id = v.org_id AND m.name = v.name);
