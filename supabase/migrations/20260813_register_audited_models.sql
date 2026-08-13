-- Three bias audits referenced models that were never in the registry, so the
-- audits had no home and could not interlink. One platform means an audited
-- model IS a governed model: register them, then re-key the audits onto the
-- canonical ai_models.id. Idempotent.
-- Applied live via Supabase MCP on 2026-08-13.
do $$
declare org uuid := '00000000-0000-0000-0000-000000000001';
        v_kyc uuid; v_nlp uuid; v_rec uuid;
begin
  insert into public.ai_models (org_id, name, slug, description, model_type, provider, version, lifecycle_stage, risk_tier, use_case, business_owner, framework, eu_ai_act_category, is_regulated)
  select org,'KYC Image Classifier','kyc-image-classifier','Identity-document image classification for KYC onboarding.','vision','Internal','4.1','production','high','KYC document verification','David Kim','PyTorch','high_risk',true
  where not exists (select 1 from public.ai_models where org_id=org and slug='kyc-image-classifier');

  insert into public.ai_models (org_id, name, slug, description, model_type, provider, version, lifecycle_stage, risk_tier, use_case, business_owner, framework, eu_ai_act_category, is_regulated)
  select org,'NLP Sentiment Analyzer','nlp-sentiment','Customer sentiment classification over support text.','nlp','Internal','1.5','production','medium','Support sentiment analysis','Jordan Lee','HuggingFace','limited_risk',false
  where not exists (select 1 from public.ai_models where org_id=org and slug='nlp-sentiment');

  insert into public.ai_models (org_id, name, slug, description, model_type, provider, version, lifecycle_stage, risk_tier, use_case, business_owner, framework, eu_ai_act_category, is_regulated)
  select org,'Recommendation Engine','recommendation-engine','Product recommendation ranking for retention.','other','Internal','2.0','production','medium','Product recommendations','James Okoro','TensorFlow','limited_risk',false
  where not exists (select 1 from public.ai_models where org_id=org and slug='recommendation-engine');

  select id into v_kyc from public.ai_models where org_id=org and slug='kyc-image-classifier' limit 1;
  select id into v_nlp from public.ai_models where org_id=org and slug='nlp-sentiment' limit 1;
  select id into v_rec from public.ai_models where org_id=org and slug='recommendation-engine' limit 1;

  update public.bias_audits set model_id=v_kyc::text where model_id='kyc-image-classifier-v4.1';
  update public.bias_audits set model_id=v_nlp::text where model_id='nlp-sentiment-v1.5';
  update public.bias_audits set model_id=v_rec::text where model_id='recommendation-engine-v2';
end $$;
