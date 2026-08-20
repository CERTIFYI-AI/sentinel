-- Why: the compliance module is the heart of the platform, and its working
-- table could not carry what the app already writes. The final compliance
-- audit (2026-09-26) found:
--
--   1. `controlService.upsertControl` writes ~20 columns that do not exist on
--      the live `controls` table (title, framework, owner, linked_model_ids,
--      effectiveness_score, …). PostgREST rejects unknown columns, so every
--      control create/edit failed, and the model/risk/policy interlink chips
--      on /compliance/controls could never populate (the mapper read the same
--      phantom columns back as []).
--   2. Only 9 of 15 frameworks had any rows in `controls` (the working
--      posture table). The 6 security frameworks (PCI DSS, HITRUST, ISO
--      27001, HIPAA, SOC 2 — 632 catalog controls) existed only in the
--      read-only `framework_controls` catalog.
--   3. No collaboration surface existed: single free-text owner, no
--      multi-user assignment, no comments, no recommendations, no
--      control-to-control crosswalk (the Frameworks "mapping" tab says so).
--
-- This migration: (A) heals the `controls` columns the app contract already
-- uses; (B) adds org-scoped, RLS-protected collaboration tables —
-- control_assignments (multi-user, role-typed), control_comments (comments +
-- recommendations), control_links (cross-framework crosswalk); (C) backfills
-- posture rows for the 6 catalog-only frameworks with an honest
-- 'not_implemented' status (never the catalog's asserted status — posture is
-- evidenced, not imported); (D) seeds crosswalk links ONLY via joins on
-- (framework code, control_ref) pairs verified to exist, drawn from the
-- published EU AI Act ↔ ISO/IEC 42001 ↔ NIST AI RMF correspondences — a pair
-- that does not resolve inserts nothing rather than inventing a mapping.
--
-- Idempotent throughout: ADD COLUMN IF NOT EXISTS, CREATE TABLE IF NOT
-- EXISTS, and every INSERT is guarded by NOT EXISTS.

-- ── A. Heal the `controls` write contract ───────────────────────────────
alter table public.controls add column if not exists control_id text;
alter table public.controls add column if not exists title text;
alter table public.controls add column if not exists framework text;
alter table public.controls add column if not exists domain text;
alter table public.controls add column if not exists requirement text;
alter table public.controls add column if not exists implementation_guidance text;
alter table public.controls add column if not exists implementation_status text;
alter table public.controls add column if not exists priority text;
alter table public.controls add column if not exists risk_level text;
alter table public.controls add column if not exists evaluation_type text;
alter table public.controls add column if not exists effectiveness_score numeric;
alter table public.controls add column if not exists owner text;
alter table public.controls add column if not exists frequency text;
alter table public.controls add column if not exists test_frequency text;
alter table public.controls add column if not exists due_date date;
alter table public.controls add column if not exists test_result text;
alter table public.controls add column if not exists remediation_plan text;
alter table public.controls add column if not exists remediation_deadline date;
alter table public.controls add column if not exists linked_model_ids uuid[] not null default '{}';
alter table public.controls add column if not exists linked_risk_ids uuid[] not null default '{}';
alter table public.controls add column if not exists linked_policy_ids uuid[] not null default '{}';
alter table public.controls add column if not exists tags text[] not null default '{}';
alter table public.controls add column if not exists is_deleted boolean not null default false;

-- Resolve display name/framework for rows that predate the heal.
update public.controls set title = name where title is null and name is not null;
update public.controls c
   set framework = f.name
  from public.frameworks f
 where c.framework is null and c.framework_id = f.id;

-- ── B. Collaboration tables ─────────────────────────────────────────────
create table if not exists public.control_assignments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default current_user_org_id(),
  control_id  uuid not null references public.controls(id) on delete cascade,
  user_id     text not null,
  user_name   text,          -- display fallback when the directory can't resolve the id
  role        text not null default 'contributor'
              check (role in ('owner','reviewer','approver','contributor')),
  assigned_by text,
  created_at  timestamptz not null default now(),
  constraint control_assignments_unique unique (control_id, user_id, role)
);
comment on table public.control_assignments is
  'Multi-user assignment on a control. A control can carry one or more owners, reviewers, approvers and contributors; reassignment is add/remove here.';

create table if not exists public.control_comments (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null default current_user_org_id(),
  control_id  uuid not null references public.controls(id) on delete cascade,
  kind        text not null default 'comment' check (kind in ('comment','recommendation')),
  body        text not null,
  author_id   text,
  author_name text,
  status      text not null default 'open' check (status in ('open','resolved')),
  created_at  timestamptz not null default now()
);
comment on table public.control_comments is
  'Discussion and recommendations on a control. kind=recommendation rows carry an open/resolved workflow; plain comments stay open.';

create table if not exists public.control_links (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null default current_user_org_id(),
  control_id         uuid not null references public.controls(id) on delete cascade,
  related_control_id uuid not null references public.controls(id) on delete cascade,
  relation           text not null default 'equivalent'
                     check (relation in ('equivalent','supports','overlaps')),
  note               text,
  created_at         timestamptz not null default now(),
  constraint control_links_not_self check (control_id <> related_control_id),
  constraint control_links_unique unique (control_id, related_control_id)
);
comment on table public.control_links is
  'Cross-framework control crosswalk: implementing one control satisfies (equivalent), contributes to (supports), or shares scope with (overlaps) the related control.';

alter table public.control_assignments enable row level security;
alter table public.control_comments enable row level security;
alter table public.control_links enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='control_assignments' and policyname='control_assignments_org_isolation') then
    create policy control_assignments_org_isolation on public.control_assignments
      for all using (org_id = current_user_org_id())
      with check (org_id = current_user_org_id());
  end if;
  if not exists (select 1 from pg_policies where tablename='control_comments' and policyname='control_comments_org_isolation') then
    create policy control_comments_org_isolation on public.control_comments
      for all using (org_id = current_user_org_id())
      with check (org_id = current_user_org_id());
  end if;
  if not exists (select 1 from pg_policies where tablename='control_links' and policyname='control_links_org_isolation') then
    create policy control_links_org_isolation on public.control_links
      for all using (org_id = current_user_org_id())
      with check (org_id = current_user_org_id());
  end if;
end $$;

create index if not exists idx_control_assignments_control on public.control_assignments(control_id);
create index if not exists idx_control_comments_control on public.control_comments(control_id);
create index if not exists idx_control_links_control on public.control_links(control_id);
create index if not exists idx_control_links_related on public.control_links(related_control_id);

-- ── C. Backfill posture rows for catalog-only frameworks ────────────────
-- Frameworks with catalog controls but zero posture rows get one posture row
-- per catalog control, status 'not_implemented': the catalog's asserted
-- status is demo data, and posture must be evidenced, never imported.
insert into public.controls
  (org_id, tenant_id, control_ref, name, title, description, framework_id, framework,
   category, domain, status, evidence_count)
select coalesce(fc.org_id, '00000000-0000-0000-0000-000000000001'::uuid),
       coalesce(fc.org_id, '00000000-0000-0000-0000-000000000001')::text,
       fc.control_ref, fc.title, fc.title, fc.description,
       f.id, f.name, fc.domain, fc.domain, 'not_implemented', 0
  from public.framework_controls fc
  join public.frameworks f on f.id::text = fc.framework_id
 where not exists (select 1 from public.controls c where c.framework_id = f.id)
   and fc.control_ref is not null;

-- ── D. Seed the crosswalk from published correspondences ────────────────
-- Every pair below joins two rows that must already exist; a ref with no
-- match inserts nothing. Sources: the EU AI Act ↔ ISO/IEC 42001 harmonised-
-- standard correspondence and NIST's published AI RMF crosswalk to the EU AI
-- Act. Same-org pairs only.
with pairs(a_code, a_ref, b_code, b_ref, rel, note) as (
  values
    -- EU AI Act ↔ ISO/IEC 42001
    ('FW-003','Art. 9',  'FW-001','Clause 6.1',   'equivalent','Risk management system ↔ AI risk assessment process'),
    ('FW-003','Art. 9',  'FW-001','Clause 6.1.2', 'supports',  'Risk management ↔ AI impact assessment'),
    ('FW-003','Art. 10', 'FW-001','Annex B.1',    'equivalent','Data & data governance ↔ training data governance'),
    ('FW-003','Art. 11', 'FW-001','Clause 7.5',   'equivalent','Technical documentation ↔ AI system documentation'),
    ('FW-003','Art. 13', 'FW-001','Annex A.4',    'equivalent','Transparency ↔ explainability requirements'),
    ('FW-003','Art. 14', 'FW-001','Annex A.8',    'equivalent','Human oversight ↔ human oversight of AI'),
    ('FW-003','Art. 15', 'FW-001','Annex A.5',    'supports',  'Accuracy & robustness ↔ AI safety controls'),
    ('FW-003','Art. 15', 'FW-001','Annex A.6',    'supports',  'Robustness & cybersecurity ↔ AI security controls'),
    ('FW-003','Art. 17', 'FW-001','Clause 8.1',   'supports',  'Quality management system ↔ operational planning'),
    ('FW-003','Art. 72', 'FW-001','Clause 9.1',   'equivalent','Post-market monitoring ↔ monitoring & measurement'),
    ('FW-003','Art. 73', 'FW-001','Annex B.6',    'equivalent','Serious-incident reporting ↔ AI incident management'),
    -- EU AI Act ↔ NIST AI RMF
    ('FW-003','Art. 9',  'FW-002','GOVERN 1.3',   'equivalent','Risk management system ↔ AI risk processes'),
    ('FW-003','Art. 9',  'FW-002','MANAGE 1.1',   'supports',  'Risk management ↔ risk treatment plans'),
    ('FW-003','Art. 14', 'FW-002','GOVERN 1.6',   'equivalent','Human oversight ↔ oversight mechanisms'),
    ('FW-003','Art. 15', 'FW-002','MEASURE 2.5',  'supports',  'Accuracy & robustness ↔ validity and reliability evaluation'),
    ('FW-003','Art. 73', 'FW-002','MANAGE 3.1',   'equivalent','Serious-incident reporting ↔ incident response'),
    -- ISO/IEC 42001 ↔ NIST AI RMF
    ('FW-001','Clause 6.1','FW-002','GOVERN 1.3', 'equivalent','AI risk assessment ↔ AI risk processes'),
    ('FW-001','Clause 5.3','FW-002','GOVERN 2.1', 'equivalent','Roles & responsibilities (both frameworks)'),
    ('FW-001','Annex A.8', 'FW-002','GOVERN 1.6', 'equivalent','Human oversight ↔ oversight mechanisms'),
    ('FW-001','Annex B.6', 'FW-002','MANAGE 3.1', 'equivalent','AI incident management ↔ incident response'),
    ('FW-001','Annex B.3', 'FW-002','MEASURE 1.1','supports',  'AI testing & evaluation ↔ measurement approaches')
)
insert into public.control_links (org_id, control_id, related_control_id, relation, note)
select ca.org_id, ca.id, cb.id, p.rel, p.note
  from pairs p
  join public.frameworks fa on fa.code = p.a_code
  join public.frameworks fb on fb.code = p.b_code
  join public.controls ca on ca.framework_id = fa.id and ca.control_ref = p.a_ref
  join public.controls cb on cb.framework_id = fb.id and cb.control_ref = p.b_ref
                          and cb.org_id = ca.org_id
 where not exists (
   select 1 from public.control_links l
    where l.control_id = ca.id and l.related_control_id = cb.id
 );

-- ── E. Strip unresolvable evidence→control references ───────────────────
-- Seed evidence rows linked controls by business code ('AI-CTL-007'), an
-- id-space that exists nowhere in `controls` (First principle #2: one
-- id-space, uuids only). Dead references read as coverage that isn't there;
-- remove them and keep only entries that resolve to a real control id.
update public.evidence e
   set linked_controls = coalesce(
     (select array_agg(x) from unnest(e.linked_controls) x
       where exists (select 1 from public.controls c where c.id::text = x)),
     '{}')
 where linked_controls is not null
   and exists (select 1 from unnest(e.linked_controls) x
                where not exists (select 1 from public.controls c where c.id::text = x));
