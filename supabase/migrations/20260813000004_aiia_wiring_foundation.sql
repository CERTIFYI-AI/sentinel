-- AIIA module foundation: make the real tenant-scoped tables writable from the
-- browser (org filled by DB default, like ai_models), add the MRC domain tables
-- that were missing, and add the use-case -> model interlink.
-- Applied live via Supabase MCP on 2026-08-13.

-- 1. Org defaults so the frontend never sets the scoping column (RLS still enforces).
-- (replay-safety: April-era unify loops may have stripped tenant_id on a
--  from-zero replay; this file encodes the current model, so heal first)
alter table public.ai_impact_assessments add column if not exists tenant_id text not null default 'default';
alter table public.use_cases            add column if not exists tenant_id text not null default 'default';
do $$ begin
  -- the April-era sweep adds org_id NOT NULL on a fresh replay; this module
  -- scopes use cases by tenant_id, so org_id must not block tenant-era rows
  if exists (select 1 from information_schema.columns
             where table_name='use_cases' and column_name='org_id' and is_nullable='NO') then
    alter table public.use_cases alter column org_id drop not null;
  end if;
  if exists (select 1 from information_schema.columns
             where table_name='ai_impact_assessments' and column_name='org_id' and is_nullable='NO') then
    alter table public.ai_impact_assessments alter column org_id drop not null;
  end if;
end $$;
alter table public.ai_impact_assessments alter column tenant_id set default current_user_org_id()::text;
alter table public.use_cases            alter column tenant_id set default current_user_org_id()::text;
alter table public.ai_risk_tiering       alter column org_id    set default current_user_org_id();
alter table public.mrc_votes             alter column org_id    set default current_user_org_id();

-- 2. Use case <-> model registry interlink (array of ai_models.id, as text).
alter table public.use_cases add column if not exists linked_model_ids text[] not null default '{}';

-- 3. MRC domain tables (votes already existed; meetings + agenda items did not).
create table if not exists public.mrc_meetings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default current_user_org_id(),
  title text not null,
  meeting_type text not null default 'Regular',
  scheduled_at timestamptz not null,
  status text not null default 'scheduled',       -- scheduled | completed | cancelled
  quorum_required int not null default 4,
  attendees jsonb not null default '[]'::jsonb,
  minutes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.mrc_agenda_items (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default current_user_org_id(),
  meeting_id uuid references public.mrc_meetings(id) on delete set null,
  title text not null,
  model_id text,                                    -- ai_models.id
  model_name text,
  review_type text not null default 'Model Review', -- Model Review | Go-Live | Incident | Periodic
  summary text,
  presenter text,
  decision text not null default 'pending',         -- pending | approved | rejected | deferred | conditional
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists mrc_agenda_items_meeting_idx on public.mrc_agenda_items(meeting_id);
create index if not exists mrc_agenda_items_model_idx on public.mrc_agenda_items(model_id);

-- 4. RLS mirroring mrc_votes (org isolation + service-role escape hatch).
alter table public.mrc_meetings enable row level security;
alter table public.mrc_agenda_items enable row level security;

drop policy if exists mrc_meetings_org_all on public.mrc_meetings;
create policy mrc_meetings_org_all on public.mrc_meetings
  for all using (org_id = current_user_org_id()) with check (org_id = current_user_org_id());
drop policy if exists mrc_meetings_service_role_all on public.mrc_meetings;
create policy mrc_meetings_service_role_all on public.mrc_meetings
  for all to service_role using (true) with check (true);

drop policy if exists mrc_agenda_items_org_all on public.mrc_agenda_items;
create policy mrc_agenda_items_org_all on public.mrc_agenda_items
  for all using (org_id = current_user_org_id()) with check (org_id = current_user_org_id());
drop policy if exists mrc_agenda_items_service_role_all on public.mrc_agenda_items;
create policy mrc_agenda_items_service_role_all on public.mrc_agenda_items
  for all to service_role using (true) with check (true);

-- 5. Drop the legacy FK that pinned ai_impact_assessments.tenant_id to the empty
-- "Tenant" table — it contradicted the org-scoped RLS and made every insert
-- impossible (the table sat permanently empty). Org integrity is enforced by RLS.
alter table public.ai_impact_assessments drop constraint if exists ai_impact_assessments_tenant_id_fkey;
