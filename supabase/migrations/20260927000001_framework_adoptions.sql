-- Why: all 15 frameworks (1,017 controls) were in scope for every tenant by
-- default, so coverage percentages averaged in frameworks the organisation
-- never chose to work against — a PCI DSS at 0% for an org that takes no
-- card payments distorts every roll-up and misleads an auditor. Which
-- frameworks an organisation manages against IS its compliance scope
-- (ISO/IEC 42001 Clause 4.3), and scope definition is a governed act that
-- must be recorded — who adopted, when, why — not a boolean someone flipped.
--
-- This migration adds `framework_adoptions` as the source of truth for that
-- scope. `frameworks.is_active` remains as a derived convenience flag, kept
-- in sync here and by the adoption service. Controls, gap analysis and the
-- controls library filter to adopted frameworks; nothing is deleted —
-- un-adopted frameworks stay one click away in the library, their posture
-- rows intact.
--
-- Initial scope seeds the six frameworks the platform's own compliance
-- programme runs against (EU AI Act, ISO/IEC 42001, NIST AI RMF, GDPR,
-- SOC 2, ISO/IEC 27001), marked as platform-seeded so a human adoption is
-- distinguishable from the default. Idempotent throughout.

create table if not exists public.framework_adoptions (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null default current_user_org_id(),
  framework_id      uuid not null references public.frameworks(id) on delete cascade,
  status            text not null default 'adopted'
                    check (status in ('adopted','paused','retired')),
  adopted_at        timestamptz not null default now(),
  adopted_by        text,
  scope_note        text,
  target_audit_date date,
  updated_at        timestamptz not null default now(),
  constraint framework_adoptions_unique unique (org_id, framework_id)
);
comment on table public.framework_adoptions is
  'The org''s compliance scope (ISO/IEC 42001 4.3): which frameworks it manages against, adopted by whom and when. Source of truth; frameworks.is_active is derived from it.';

alter table public.framework_adoptions enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='framework_adoptions' and policyname='framework_adoptions_org_isolation') then
    create policy framework_adoptions_org_isolation on public.framework_adoptions
      for all using (org_id = current_user_org_id())
      with check (org_id = current_user_org_id());
  end if;
end $$;

create index if not exists idx_framework_adoptions_org on public.framework_adoptions(org_id);

-- Seed the initial scope for the platform tenant. Codes verified live:
-- FW-003 EU AI Act, FW-001 ISO/IEC 42001, FW-002 NIST AI RMF, FW-007 GDPR,
-- FW-011 SOC 2, FW-012 ISO/IEC 27001.
insert into public.framework_adoptions (org_id, framework_id, adopted_by, scope_note)
select f.org_id, f.id, 'Platform seed (initial scope)',
       'Seeded as the initial compliance scope; confirm or retire from the Frameworks library.'
  from public.frameworks f
 where f.code in ('FW-001','FW-002','FW-003','FW-007','FW-011','FW-012')
   and not exists (select 1 from public.framework_adoptions a
                    where a.org_id = f.org_id and a.framework_id = f.id);

-- Derive is_active from adoption: adopted → active, everything else inactive.
update public.frameworks f
   set is_active = exists (
     select 1 from public.framework_adoptions a
      where a.framework_id = f.id and a.org_id = f.org_id and a.status = 'adopted');
