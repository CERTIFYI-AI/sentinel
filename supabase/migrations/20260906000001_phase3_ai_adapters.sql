-- 20260906000001_phase3_ai_adapters.sql
--
-- Flip adapter_status for Phase 3: AI platform adapters.
-- Idempotent.

update public.integration_catalog
set    adapter_status = 'shipped'
where  slug in (
  'openai',
  'openai_azure_openai',
  'anthropic_claude_api',
  'anthropic_claude_console',
  'hugging_face_enterprise',
  'github_copilot',
  'cursor_codeium',
  'langsmith_langfuse',
  'arize_ai_phoenix',
  'weights_biases_w_b',
  'pinecone',
  'weaviate',
  'lakera_protect_ai',
  'hiddenlayer'
)
  and adapter_status <> 'shipped';
