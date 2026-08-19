-- AI Brain configuration: org-scoped provider credentials and model preferences.
-- The API key is AES-256-GCM encrypted in the same blob format as
-- integrations.credentials_encrypted (sentinel/integrations/crypto.py),
-- so the Python evaluator reuses the same decrypt_credentials() function.
-- Plaintext never touches this table or any log.

create table if not exists ai_brain_config (
  id            uuid        primary key default gen_random_uuid(),
  org_id        text        not null default current_user_org_id()::text,
  provider      text        not null default 'openai',
  credentials_encrypted jsonb,
  key_prefix    text,
  judge_model   text        not null default 'gpt-4o-mini',
  embedding_model text      not null default 'text-embedding-3-small',
  auto_action_confidence numeric not null default 0.85,
  enabled       boolean     not null default false,
  updated_at    timestamptz not null default now(),
  updated_by    text,
  constraint ai_brain_config_org_unique unique (org_id)
);

comment on table ai_brain_config is
  'Per-org AI Brain configuration: provider, encrypted API key, model preferences.';
comment on column ai_brain_config.credentials_encrypted is
  'AES-256-GCM blob {v,nonce,ciphertext} — same format as integrations. Never plaintext.';
comment on column ai_brain_config.key_prefix is
  'First 8 chars of the key for display (e.g. "sk-proj-…"). Never the full key.';

alter table ai_brain_config enable row level security;

create policy ai_brain_config_org_isolation on ai_brain_config
  for all using (org_id = current_user_org_id()::text)
  with check (org_id = current_user_org_id()::text);
