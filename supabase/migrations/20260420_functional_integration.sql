-- ============================================================================
-- Sentinel Functional Integration Migration
-- Adds all tables referenced by dashboard services/hooks that were not yet
-- defined in prior migrations. Additive only. Idempotent. RLS-secured.
-- Date: 2026-04-20
-- ============================================================================

-- Common helpers (noop if already present via 006_core.sql)
create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

-- get_org_id() already exists from 006_core.sql; fall-back define if missing
do $$ begin
  if not exists (select 1 from pg_proc where proname='get_org_id') then
    create or replace function public.get_org_id() returns uuid
    language sql security definer as $fn$
      select coalesce(
        (select org_id from public.user_profiles where id = auth.uid()),
        '00000000-0000-0000-0000-000000000001'::uuid
      );
    $fn$;
  end if;
end $$;

-- Macro-style table creation via DO block + array
do $$
declare
  t text;
  missing_tables text[] := array[
    'ai_impact_assessments','api_keys','approvals','attack_surface_assets',
    'bcp_plans','carbon_records','compliance_calendar','conformity_assessments',
    'consent_records','data_assets','departments','documents','dsar_requests',
    'ethics_reports','exceptions','explainability_reports','guardrails',
    'keys_vault','maturity_assessments','model_arena_runs','policy_firewall_rules',
    'prompt_registry','red_team_campaigns','red_team_findings','regulations',
    'remediation_plans','security_scans','security_threats','security_vulnerabilities',
    'supply_chain_attestations','training_courses'
  ];
begin
  foreach t in array missing_tables loop
    execute format($f$
      create table if not exists public.%I (
        id uuid primary key default gen_random_uuid(),
        org_id uuid not null default public.get_org_id(),
        tenant_id text not null default 'default',
        name text,
        title text,
        description text,
        status text default 'active',
        type text,
        severity text,
        owner text,
        assignee_id uuid,
        created_by uuid default auth.uid(),
        updated_by uuid,
        metadata jsonb not null default '{}'::jsonb,
        payload jsonb not null default '{}'::jsonb,
        tags text[] default '{}',
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      );
      alter table public.%I enable row level security;
      create index if not exists %I on public.%I (org_id, created_at desc);
      create index if not exists %I on public.%I (tenant_id);
      drop trigger if exists trg_set_updated_at on public.%I;
      create trigger trg_set_updated_at before update on public.%I
        for each row execute function public.set_updated_at();
    $f$, t, t, t||'_org_created_idx', t, t||'_tenant_idx', t, t, t);

    -- Tenant isolation RLS
    execute format($f$
      drop policy if exists tenant_select on public.%I;
      create policy tenant_select on public.%I for select
        using (
          tenant_id = coalesce(current_setting('app.tenant_id', true), 'default')
          or org_id = public.get_org_id()
          or auth.role() = 'service_role'
        );
    $f$, t, t);

    execute format($f$
      drop policy if exists tenant_write on public.%I;
      create policy tenant_write on public.%I for all
        using (
          tenant_id = coalesce(current_setting('app.tenant_id', true), 'default')
          or org_id = public.get_org_id()
          or auth.role() = 'service_role'
        )
        with check (
          tenant_id = coalesce(current_setting('app.tenant_id', true), 'default')
          or org_id = public.get_org_id()
          or auth.role() = 'service_role'
        );
    $f$, t, t);
  end loop;
end $$;

-- Foreign-key enrichment for specific join patterns used by services
alter table public.red_team_findings
  add column if not exists campaign_id uuid references public.red_team_campaigns(id) on delete cascade;

alter table public.remediation_plans
  add column if not exists incident_id uuid,
  add column if not exists due_date timestamptz;

alter table public.approvals
  add column if not exists entity_type text,
  add column if not exists entity_id uuid,
  add column if not exists decision text,
  add column if not exists approver_id uuid;

alter table public.guardrails
  add column if not exists rule jsonb default '{}'::jsonb,
  add column if not exists breach_count integer default 0;

alter table public.prompt_registry
  add column if not exists version text default '1.0.0',
  add column if not exists content text;

alter table public.api_keys
  add column if not exists key_hash text,
  add column if not exists last_used_at timestamptz,
  add column if not exists scopes text[] default '{}';

alter table public.documents
  add column if not exists uri text,
  add column if not exists sha256 text,
  add column if not exists mime_type text;

alter table public.departments
  add column if not exists head_user_id uuid,
  add column if not exists parent_id uuid references public.departments(id);

-- Realtime publication: ensure all functional tables are in supabase_realtime
do $$
declare t text;
begin
  for t in select unnest(array[
    'ai_impact_assessments','approvals','attack_surface_assets','bcp_plans',
    'carbon_records','compliance_calendar','conformity_assessments','consent_records',
    'data_assets','departments','documents','dsar_requests','ethics_reports',
    'exceptions','explainability_reports','guardrails','maturity_assessments',
    'model_arena_runs','policy_firewall_rules','prompt_registry','red_team_campaigns',
    'red_team_findings','regulations','remediation_plans','security_scans',
    'security_threats','security_vulnerabilities','supply_chain_attestations',
    'training_courses','keys_vault','api_keys'
  ]) loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when others then null; -- already added or publication doesn't exist
    end;
  end loop;
end $$;

-- Universal audit trigger: append to audit_log on any write to tracked tables
create or replace function public.fn_audit_trigger() returns trigger
language plpgsql security definer as $$
begin
  insert into public.audit_log (
    org_id, actor_id, actor_name, actor_role,
    module, entity_type, entity_id, entity_name, action,
    old_values, new_values
  ) values (
    coalesce((new.org_id)::uuid, (old.org_id)::uuid, public.get_org_id()),
    auth.uid(),
    coalesce(current_setting('app.actor_name', true), 'system'),
    coalesce(current_setting('app.actor_role', true), 'system'),
    tg_table_schema,
    tg_table_name,
    coalesce((new.id)::uuid, (old.id)::uuid),
    coalesce((new.name)::text, (old.name)::text, (new.title)::text, (old.title)::text),
    tg_op,
    case when tg_op = 'INSERT' then null else to_jsonb(old) end,
    case when tg_op = 'DELETE' then null else to_jsonb(new) end
  );
  return coalesce(new, old);
exception when others then
  return coalesce(new, old); -- never block writes on audit failure
end $$;

-- Attach audit trigger to critical tables (idempotent)
do $$
declare t text;
begin
  for t in select unnest(array[
    'policies','controls','risks','incidents','approvals','guardrails',
    'red_team_findings','bias_audits','model_inventory','evidence','remediation_plans'
  ]) loop
    begin
      execute format('drop trigger if exists trg_audit on public.%I', t);
      execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.fn_audit_trigger()', t);
    exception when others then null; -- skip tables that don't exist yet
    end;
  end loop;
end $$;

-- Notifications helper: fire NOTIFY on incident insert for dashboards
create or replace function public.fn_notify_incident() returns trigger
language plpgsql as $$
begin
  perform pg_notify('sentinel.incidents', json_build_object(
    'id', new.id, 'severity', new.severity, 'title', new.title
  )::text);
  return new;
end $$;

do $$ begin
  if exists (select 1 from information_schema.tables where table_name='incidents') then
    drop trigger if exists trg_notify_incident on public.incidents;
    create trigger trg_notify_incident after insert on public.incidents
      for each row execute function public.fn_notify_incident();
  end if;
end $$;

-- Grant usage to authenticated + anon (anon is still RLS-guarded)
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant select on all tables in schema public to anon;

