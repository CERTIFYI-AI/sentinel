-- 20260823000001_admin_registers_and_demo_table_lockdown.sql
--
-- Two jobs, both prerequisites for taking the ADMIN group off its demo tables.
--
-- 1. ADMIN registers (Asset Registry, BIA, Identity Governance) get the same
--    treatment the privacy group already had: a single normalised vocabulary
--    enforced by CHECK constraints, tenant scoping filled by the database
--    rather than the client, and real interlink columns so a BIA process can
--    name the assets it depends on and an identity can name the models it
--    reaches.
--
--    Vocabulary matters here because it has already bitten this platform: a
--    column storing 'Critical' while the page filters on 'critical' produces a
--    register that silently reports zero. bia_processes.criticality was Title
--    Case, identities.identity_type and privilege_level were Title Case, and
--    the pages about to be written filter on lowercase.
--
-- 2. The `<name>_table` demo tables are closed to cross-tenant access.
--    Every one of them still carried a live policy `USING (true) WITH CHECK
--    (true)` granted to `authenticated` — meaning any signed-in user of any
--    tenant could read and write every row of every one of them,
--    `keysvault_table` included — because the containment committed in
--    20260822000002 §9 never actually applied (see §2 below for the root
--    cause). Each now gets an org_id column, a backfill, and an org-scoped
--    policy in a form that applies cleanly.
--
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-23.

-- ── 1a. Tenant scoping: the client must never choose the tenant ─────────────
--
-- These three defaulted to a hardcoded literal org uuid, so a row inserted by
-- any other tenant landed in org 00000000-…-0001. That is the same trap
-- 20260816000010 removed from eight other tables; these three were missed
-- because they default a uuid column rather than a text one.

-- Guarded exactly as bia_processes/identities are below: `assets` has no
-- tenant_id column in this repo's schema (it is org_id-scoped), so the bare
-- ALTER aborted the migration on a from-zero replay (audit F1).
do $assets_tenant$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='assets' and column_name='tenant_id') then
    alter table public.assets alter column tenant_id set default current_user_org_id();
  end if;
end $assets_tenant$;

-- bia_processes and identities live only on the live project (the baseline
-- gap documented in supabase/migrations/README.md) — guard so a from-zero
-- replay skips them instead of failing.
do $$
begin
  if to_regclass('public.bia_processes') is not null then
    alter table public.bia_processes alter column tenant_id set default current_user_org_id();
  end if;
  if to_regclass('public.identities') is not null then
    alter table public.identities alter column tenant_id set default current_user_org_id();
  end if;
end $$;

-- sod_rules.org_id had no default at all. Its RLS policy is
-- `USING (org_id = get_org_id())` with no WITH CHECK, so Postgres reuses the
-- USING expression on write: a NULL org_id fails the check and every insert
-- was rejected outright. Fail-closed, but the register was unusable.
alter table public.sod_rules      alter column org_id   set default get_org_id();

-- ── 1b. Vocabulary normalisation + CHECK constraints ───────────────────────

do $$
begin
  if to_regclass('public.bia_processes') is null then return; end if;
  update public.bia_processes set criticality = lower(criticality) where criticality is not null;
  alter table public.bia_processes drop constraint if exists bia_processes_criticality_chk;
  alter table public.bia_processes add  constraint bia_processes_criticality_chk
    check (criticality is null or criticality in ('critical','high','medium','low'));
end $$;

-- 'Human' -> 'human', 'Service' -> 'service'. 'agent' is added to the
-- vocabulary because the platform governs non-human actors and the register
-- has to be able to name one.
do $$
begin
  if to_regclass('public.identities') is null then return; end if;
  update public.identities set identity_type = lower(identity_type) where identity_type is not null;
  update public.identities set privilege_level = lower(privilege_level) where privilege_level is not null;
  update public.identities set review_status = lower(review_status) where review_status is not null;
  alter table public.identities drop constraint if exists identities_identity_type_chk;
  alter table public.identities add  constraint identities_identity_type_chk
    check (identity_type is null or identity_type in ('human','service','agent'));
  alter table public.identities drop constraint if exists identities_privilege_level_chk;
  alter table public.identities add  constraint identities_privilege_level_chk
    check (privilege_level is null or privilege_level in ('admin','operator','viewer'));
  alter table public.identities drop constraint if exists identities_review_status_chk;
  alter table public.identities add  constraint identities_review_status_chk
    check (review_status is null or review_status in ('current','due','overdue','revoked'));
end $$;

-- ── 1c. Interlinks ─────────────────────────────────────────────────────────
--
-- A BIA process that cannot name the assets it runs on cannot answer the only
-- question a BIA exists to answer: what actually stops working. assets already
-- carries bia_rto_hours/bia_rpo_hours copied from here, but the relationship
-- was one-way and untraceable — you could not get from a process back to its
-- assets.

do $$
begin
  if to_regclass('public.bia_processes') is null then return; end if;
  alter table public.bia_processes
    add column if not exists linked_asset_ids uuid[] default '{}',
    add column if not exists linked_model_ids uuid[] default '{}';
end $$;

-- Assets were matched to processes by department when their recovery
-- objectives were copied across (20260817000001). The same join is what makes
-- the link explicit rather than implied.
do $$
begin
  if to_regclass('public.bia_processes') is null then return; end if;
  update public.bia_processes p
  set linked_asset_ids = coalesce((
    select array_agg(a.id order by a.asset_ref)
    from public.assets a
    where lower(a.department) = lower(p.department)
  ), '{}');
end $$;

-- The models reached through those assets, so a process links to the registry
-- entity and not only to the infrastructure.
do $$
begin
  if to_regclass('public.bia_processes') is null then return; end if;
  update public.bia_processes p
  set linked_model_ids = coalesce((
    select array_agg(distinct a.entity_id)
    from public.assets a
    where a.id = any(p.linked_asset_ids)
      and a.entity_type = 'ai_model'
      and a.entity_id is not null
  ), '{}');
end $$;

-- identities.ai_systems_access was a bare integer with no provenance: it
-- asserted "this person reaches 7 AI systems" without naming one, so it could
-- neither be verified nor clicked through. It is now derived from a real list
-- of model ids, under a stated access rule rather than an unexplained number:
--
--   admin    -> every registered model
--   operator -> models in production
--   viewer   -> none
--
-- The rule is demo-tenant seeding, not an entitlement scan, and the Identity
-- Governance page labels it as such. What matters is that the figure is now
-- reproducible from the rule and every id resolves to a real registry record.
do $$
begin
  if to_regclass('public.identities') is null then return; end if;
  alter table public.identities
    add column if not exists linked_model_ids uuid[] default '{}';
  update public.identities i set linked_model_ids = coalesce((
    select array_agg(m.id order by m.name) from public.ai_models m
    where case lower(coalesce(i.privilege_level, ''))
      when 'admin'    then true
      when 'operator' then m.lifecycle_stage = 'production'
      else false
    end
  ), '{}');
  -- Keep the integer in step so nothing reads a stale count, exactly as
  -- assets.criticality is kept in step with risk_level.
  update public.identities set ai_systems_access = coalesce(array_length(linked_model_ids, 1), 0);
  create index if not exists idx_identities_linked_model_ids on public.identities using gin (linked_model_ids);
end $$;

do $$
begin
  if to_regclass('public.bia_processes') is not null then
    create index if not exists idx_bia_processes_linked_asset_ids on public.bia_processes using gin (linked_asset_ids);
  end if;
end $$;

-- ── 2. Demo-table containment, re-applied so it actually holds ─────────────
--
-- `<name>_table` tables are the generic (id, doc jsonb) demo tables CLAUDE.md
-- forbids wiring a page to. Each was created with
--   create policy "<name>_table_authenticated_all" on <name>_table
--     for all to authenticated using (true) with check (true);
-- which is not tenant isolation at all: it grants every authenticated user of
-- every organisation full read/write over every row.
--
-- 20260822000002 §9 was written to contain exactly this, and the debt
-- register recorded it as verified (53/53). On the live project it never
-- held: 0/53 tables had the org_id column and all the blanket grants were
-- still in place. Root cause: §9 adds the column as
-- `NOT NULL DEFAULT current_user_org_id()`, and under the admin apply
-- context that resolver returns NULL, so the ALTER aborts on the first
-- table's existing rows and the whole DO block rolls back — silently, because
-- out-of-band applies don't gate the deploy. The lesson for the register:
-- "verified" means a query was run against live, not that the SQL was
-- committed.
--
-- This block is the corrected containment: nullable add, explicit backfill of
-- the existing demo-tenant rows, then the NOT NULL constraint — each step
-- valid in the admin context, all idempotent.
do $$
declare t text;
begin
  for t in
    select c.relname from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname like '%\_table'
  loop
    execute format('alter table public.%I add column if not exists org_id uuid default current_user_org_id()', t);
    -- Existing rows are demo-tenant seeds; claim them explicitly.
    execute format('update public.%I set org_id = ''00000000-0000-0000-0000-000000000001'' where org_id is null', t);
    execute format('alter table public.%I alter column org_id set not null', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t || '_anon_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_authenticated_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_org_all', t);
    execute format(
      'create policy %I on public.%I for all to authenticated '
      || 'using (org_id = current_user_org_id()) with check (org_id = current_user_org_id())',
      t || '_org_all', t);
  end loop;
end $$;

-- Verified after apply: 53/53 demo tables carry org_id NOT NULL, 53/53 carry
-- the org-scoped policy, 0 blanket authenticated grants remain
-- (pg_policies query, 2026-08-23). Containment is still not remediation —
-- reporting_table and modelriskcommittee_table remain page-consumed and are
-- tracked in TD-001.
