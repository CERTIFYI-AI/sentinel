-- Demo seed: prompt_registry rows (tenant TNT-001, admitted by the table's RLS)
-- so the wired Prompt Registry shows live prompts with version history. Idempotent
-- (NOT EXISTS on id). Timestamp columns cast explicitly. Applied via Supabase MCP.
INSERT INTO public.prompt_registry
 (id, tenant_id, name, category, status, model, owner, current_version, description, content, tags, used_by, token_count, versions, approved_by, approval_date, last_modified, created_date)
SELECT * FROM (VALUES
 ('PR-001','TNT-001','Credit Decision Explainer','system','active','GPT-4o','Maria Santos','1.2.0',
   'Explains a credit decision in plain language with the top contributing factors.',
   'You are a compliance-aware assistant. Given a credit decision {{decision}} and factors {{factors}}, explain the outcome in plain language. Do not reveal protected attributes.',
   '["credit","explainability","xai"]'::jsonb,'["Credit Risk Scorer"]'::jsonb,64,
   '[{"version":"1.2.0","content":"...","author":"Maria Santos","changedAt":"2026-06-05T09:00:00Z","changeNote":"Added protected-attribute guardrail."},{"version":"1.0.0","content":"...","author":"Maria Santos","changedAt":"2026-03-15T09:00:00Z","changeNote":"Initial version."}]'::jsonb,
   'CISO','2026-06-06T10:00:00Z'::timestamptz,'2026-06-05T09:00:00Z'::timestamptz,'2026-03-15T09:00:00Z'::timestamptz),
 ('PR-002','TNT-001','Fraud Alert Summarizer','system','active','Claude 3.5','David Kim','1.0.0',
   'Summarizes a fraud alert for an analyst with recommended next actions.',
   'Summarize the fraud alert {{alert}} in 3 bullet points and recommend a next action. Be concise and factual.',
   '["fraud","summarization"]'::jsonb,'["Fraud Detection Engine"]'::jsonb,48,
   '[{"version":"1.0.0","content":"...","author":"David Kim","changedAt":"2026-06-08T09:00:00Z","changeNote":"Initial version."}]'::jsonb,
   'CTO','2026-06-08T12:00:00Z'::timestamptz,'2026-06-08T09:00:00Z'::timestamptz,'2026-06-08T09:00:00Z'::timestamptz),
 ('PR-003','TNT-001','Nepali Support Assistant','user','under_review','NepBERTa','Language AI Team','0.9.0',
   'Nepali-language customer support assistant prompt (uses NepBERTa embeddings for retrieval).',
   'तपाईं एक सहयोगी ग्राहक सेवा सहायक हुनुहुन्छ। प्रश्न {{query}} को उत्तर नेपालीमा दिनुहोस्।',
   '["nepali","support","nlp"]'::jsonb,'["NepBERTa"]'::jsonb,40,
   '[{"version":"0.9.0","content":"...","author":"Language AI Team","changedAt":"2026-07-20T09:00:00Z","changeNote":"Draft for review."}]'::jsonb,
   NULL,NULL::timestamptz,'2026-07-20T09:00:00Z'::timestamptz,'2026-07-20T09:00:00Z'::timestamptz)
) AS v(id,tenant_id,name,category,status,model,owner,current_version,description,content,tags,used_by,token_count,versions,approved_by,approval_date,last_modified,created_date)
WHERE NOT EXISTS (SELECT 1 FROM public.prompt_registry p WHERE p.id=v.id);
