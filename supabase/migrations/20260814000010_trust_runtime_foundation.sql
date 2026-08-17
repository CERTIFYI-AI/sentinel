-- 20260814_trust_runtime_foundation
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-14 via mcp apply_migration.
-- Foundation for the Runtime Trust group: org-scoping defaults, uuid keying + FKs
-- to ai_models/live_traces, RLS normalization for model_trust_configs, drop of the
-- unusable "TrustTrace" table, and query indexes. Idempotent.

-- 1) Org-scoping + timestamp defaults ---------------------------------------
alter table public.cost_token_usage  alter column org_id set default current_user_org_id();
alter table public.fallback_logs     alter column org_id set default current_user_org_id();
alter table public.tool_call_logs    alter column org_id set default current_user_org_id();

alter table public.cost_token_usage  alter column usage_date  set default current_date;
alter table public.fallback_logs     alter column occurred_at set default now();

-- 2) Uuid keying (tables are empty; retype is safe) -------------------------
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema = 'public' and table_name = 'cost_token_usage'
               and column_name = 'model_id' and data_type = 'text') then
    alter table public.cost_token_usage
      alter column model_id type uuid using model_id::uuid;
  end if;
end $$;

alter table public.cost_token_usage drop constraint if exists cost_token_usage_model_id_fkey;
alter table public.cost_token_usage
  add constraint cost_token_usage_model_id_fkey
  foreign key (model_id) references public.ai_models(id) on delete set null;

-- Keep primary_model / fallback_model text columns for display compat;
-- uuid columns are the canonical keys.
alter table public.fallback_logs
  add column if not exists primary_model_id  uuid references public.ai_models(id)   on delete set null,
  add column if not exists fallback_model_id uuid references public.ai_models(id)   on delete set null,
  add column if not exists trace_id          uuid references public.live_traces(id) on delete set null;

alter table public.tool_call_logs
  add column if not exists model_id uuid references public.ai_models(id)   on delete set null,
  add column if not exists trace_id uuid references public.live_traces(id) on delete set null;

-- 2b) Repoint legacy FKs: live_traces.model_id and guardrail_events.model_id
-- referenced the empty legacy "models" table instead of ai_models (the platform's
-- single id-space for models). Both tables are empty, so repointing is safe.
alter table public.live_traces drop constraint if exists live_traces_model_id_fkey;
alter table public.live_traces
  add constraint live_traces_model_id_fkey
  foreign key (model_id) references public.ai_models(id) on delete set null;

alter table public.guardrail_events drop constraint if exists guardrail_events_model_id_fkey;
alter table public.guardrail_events
  add constraint guardrail_events_model_id_fkey
  foreign key (model_id) references public.ai_models(id) on delete set null;

-- 3) Normalize model_trust_configs RLS to current_user_org_id() -------------
-- (replay-safety: live gained these columns out-of-band; the trust seeds use
--  them. No-op live.)
alter table public.model_trust_configs add column if not exists toxicity_threshold numeric;
alter table public.model_trust_configs add column if not exists hallucination_threshold numeric;
alter table public.model_trust_configs add column if not exists pii_detection_enabled boolean default true;
alter table public.model_trust_configs add column if not exists jailbreak_detection boolean default true;
alter table public.model_trust_configs add column if not exists output_filtering boolean default true;
alter table public.model_trust_configs add column if not exists cost_alert_usd numeric;
alter table public.model_trust_configs add column if not exists token_limit_per_req integer;
alter table public.model_trust_configs add column if not exists rate_limit_rpm integer;
alter table public.model_trust_configs add column if not exists fallback_model_id uuid;
alter table public.model_trust_configs add column if not exists blocked_topics text[] default '{}';

alter table public.model_trust_configs alter column org_id set default current_user_org_id();
drop policy if exists model_trust_configs_org_isolation on public.model_trust_configs;
create policy model_trust_configs_org_isolation on public.model_trust_configs
  for all
  using (org_id = current_user_org_id())
  with check (org_id = current_user_org_id());

-- 4) Drop unusable camelCase table (empty, RLS enabled with zero policies) --
do $$ begin
  -- on a fresh replay "TrustTrace" is a quarantine VIEW, not a table
  execute (select case c.relkind when 'v' then 'drop view if exists public."TrustTrace" cascade'
                  else 'drop table if exists public."TrustTrace" cascade' end
           from pg_class c join pg_namespace n on n.oid=c.relnamespace
           where n.nspname='public' and c.relname='TrustTrace');
exception when others then null; end $$;

-- 5) Indexes ----------------------------------------------------------------
create index if not exists idx_live_traces_model_created      on public.live_traces (model_id, created_at desc);
create index if not exists idx_guardrail_events_model_created on public.guardrail_events (model_id, created_at desc);
create index if not exists idx_cost_token_usage_model_date    on public.cost_token_usage (model_id, usage_date);
create index if not exists idx_tool_call_logs_trace           on public.tool_call_logs (trace_id);
create index if not exists idx_fallback_logs_primary_model    on public.fallback_logs (primary_model_id);
