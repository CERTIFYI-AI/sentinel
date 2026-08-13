-- Backend tables that make the Model Detail page fully data-driven instead of
-- rendering hardcoded documents / activity / alert config. All are org-scoped
-- via get_org_id() (SECURITY DEFINER) and cascade with the parent ai_models row.
-- Applied live via Supabase MCP on 2026-08-13.

create table if not exists public.model_documents (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.get_org_id(),
  model_id uuid not null references public.ai_models(id) on delete cascade,
  title text not null,
  doc_type text not null default 'LINK',
  url text not null,
  description text,
  created_by text,
  created_at timestamptz not null default now()
);
create index if not exists model_documents_model_idx on public.model_documents(model_id);

create table if not exists public.model_activity (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.get_org_id(),
  model_id uuid not null references public.ai_models(id) on delete cascade,
  event text not null,
  actor text,
  kind text not null default 'info' check (kind in ('info','success','warning','error')),
  created_at timestamptz not null default now()
);
create index if not exists model_activity_model_idx on public.model_activity(model_id, created_at desc);

create table if not exists public.model_alert_configs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null default public.get_org_id(),
  model_id uuid not null unique references public.ai_models(id) on delete cascade,
  fairness_threshold int not null default 80,
  drift_threshold int not null default 5,
  channels jsonb not null default '{"email":true,"slack":false,"pagerduty":false}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.model_documents enable row level security;
alter table public.model_activity enable row level security;
alter table public.model_alert_configs enable row level security;

create policy model_documents_org on public.model_documents
  for all using (org_id = public.get_org_id()) with check (org_id = public.get_org_id());
create policy model_activity_org on public.model_activity
  for all using (org_id = public.get_org_id()) with check (org_id = public.get_org_id());
create policy model_alert_configs_org on public.model_alert_configs
  for all using (org_id = public.get_org_id()) with check (org_id = public.get_org_id());
