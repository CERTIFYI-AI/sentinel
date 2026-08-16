-- Unify the model id-space: re-key legacy rows that referenced models by
-- business-code / slug onto the canonical ai_models.id (uuid), so every module
-- interlinks by the same identifier. Idempotent (only touches non-uuid ids).
-- Applied live via Supabase MCP on 2026-08-13.

update public.model_dna d
set model_id = m.id::text
from public.ai_models m
where m.name = d.model_name and m.org_id = d.org_id
  and (d.model_id is null or d.model_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

update public.model_lifecycle_stages l
set model_id = m.id::text
from public.ai_models m
where m.name = l.model_name and m.org_id = l.org_id
  and (l.model_id is null or l.model_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');

update public.bias_audits set model_id = '83a20820-aa10-4216-8ad6-80e4261071cf' where model_id = 'credit-scoring-v3.2.1';
update public.bias_audits set model_id = 'e61f991b-7da7-4b81-9deb-aa8665bb6ac1' where model_id = 'fraud-detection-v2.8';
update public.bias_audits set model_id = '0fac9e56-8ddf-47eb-922e-ed11086fd260' where model_id = 'churn-prediction-v1.2';
-- kyc-image-classifier-v4.1 / nlp-sentiment-v1.5 / recommendation-engine-v2 have
-- no registry model; left as-is (they simply don't interlink).

-- Prompt Registry <-> models interlink: which governed models use this prompt.
alter table public.prompt_registry add column if not exists used_by_model_ids text[] not null default '{}';

-- Demo backfill so the interlink is visible.
update public.prompt_registry set used_by_model_ids = array['83a20820-aa10-4216-8ad6-80e4261071cf']
  where (lower(name) like '%credit%' or lower(coalesce(description,'')) like '%credit%' or lower(coalesce(content,'')) like '%credit%')
    and cardinality(used_by_model_ids)=0;
update public.prompt_registry set used_by_model_ids = array['e61f991b-7da7-4b81-9deb-aa8665bb6ac1']
  where (lower(name) like '%fraud%' or lower(coalesce(description,'')) like '%fraud%')
    and cardinality(used_by_model_ids)=0;
