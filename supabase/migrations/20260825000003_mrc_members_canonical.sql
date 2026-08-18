-- 20260825000003_mrc_members_canonical.sql
--
-- Model Risk Committee members move off the last page-consumed demo table.
--
-- The MRC page was already hybrid: meetings, agenda items and votes live in
-- real org-scoped tables (mrc_meetings / mrc_agenda_items / mrc_votes,
-- 20260813-era AIIA work), but the members roster — the thing quorum is
-- computed from — still read `modelriskcommittee_table`, a generic
-- (id, doc jsonb) demo table. A committee whose quorum comes from a demo
-- table cannot evidence Art. 14-style oversight. With this migration and the
-- retirement of /reporting, ZERO pages read a `<name>_table` demo table.
--
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-25.

create table if not exists public.mrc_members (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default current_user_org_id(),
  name        text not null,
  role        text,
  department  text,
  is_chair    boolean not null default false,
  -- Whether this member counts toward quorum (voting member).
  counts_toward_quorum boolean not null default true,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.mrc_members enable row level security;

drop policy if exists mrc_members_org on public.mrc_members;
create policy mrc_members_org on public.mrc_members
  for all to authenticated
  using (org_id = current_user_org_id())
  with check (org_id = current_user_org_id());
drop policy if exists mrc_members_service on public.mrc_members;
create policy mrc_members_service on public.mrc_members
  for all to service_role using (true) with check (true);

-- Demo-tenant seed: the same seven members the demo table carried, claimed
-- explicitly by the demo org (admin-context resolver returns NULL, so the
-- default cannot fill it here).
insert into public.mrc_members (org_id, name, role, department, is_chair, counts_toward_quorum)
select '00000000-0000-0000-0000-000000000001', v.name, v.role, v.department, v.chair, v.quorum
from (values
  ('Sarah Chen',   'CISO',               'Security',   true,  true),
  ('James Patel',  'VP Compliance',      'Compliance', false, true),
  ('Raj Gupta',    'Model Risk Manager', 'AI/ML',      false, true),
  ('David Kim',    'Risk Analyst',       'Risk',       false, true),
  ('Emma Wilson',  'Internal Auditor',   'Audit',      false, false),
  ('Oliver Tran',  'Chief Data Officer', 'Data',       false, true),
  ('Priya Nair',   'General Counsel',    'Legal',      false, false)
) as v(name, role, department, chair, quorum)
where not exists (
  select 1 from public.mrc_members
  where org_id = '00000000-0000-0000-0000-000000000001' and name = v.name
);
