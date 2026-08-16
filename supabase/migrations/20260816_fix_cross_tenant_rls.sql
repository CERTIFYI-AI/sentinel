-- 20260816_fix_cross_tenant_rls.sql
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-16.
--
-- SECURITY FIX — cross-tenant RLS holes on four real tenant-scoped tables,
-- found by the Gate 4 compliance sweep (docs/contributing/review-process.md).
--
-- Root cause: Postgres OR-combines PERMISSIVE policies. Each of these tables
-- carried a correct org-isolation policy AND a second permissive policy whose
-- predicate was `true` (or an auth.role() check with no tenant condition) for
-- the `authenticated` role. The second policy therefore widened access past the
-- first: any authenticated user in ANY organisation could read — and in three
-- cases write — every other tenant's rows.
--
-- This is the failure mode that makes "we enabled RLS" insufficient as an
-- assurance statement: RLS was enabled on all four tables the whole time.
--
-- All four tables were empty when the fix was applied, so this closes a latent
-- hole rather than remediating an active exposure.

-- ── webhook_endpoints ───────────────────────────────────────────────────────
-- `whe_auth_read` exposed destination URLs and secret prefixes across tenants.
-- `whe_svc_all` is retained: self-restricting to service_role, which the
-- server-side delivery worker legitimately needs for cross-tenant dispatch.
drop policy if exists whe_auth_read on public.webhook_endpoints;
drop policy if exists webhook_endpoints_org_isolation on public.webhook_endpoints;
create policy webhook_endpoints_org_isolation on public.webhook_endpoints
  for all
  using (tenant_id = (current_user_org_id())::text)
  with check (tenant_id = (current_user_org_id())::text);

-- ── agents ──────────────────────────────────────────────────────────────────
drop policy if exists agents_authenticated_only on public.agents;
alter table public.agents enable row level security;
drop policy if exists agents_org_isolation on public.agents;
create policy agents_org_isolation on public.agents
  for all
  using (org_id = current_user_org_id())
  with check (org_id = current_user_org_id());

-- ── shadow_ai_findings ──────────────────────────────────────────────────────
-- tenant_id also defaulted to the literal 'default', so discovered shadow-AI
-- findings would have landed outside org isolation exactly as tasks.tenant_id
-- did before its repair.
alter table public.shadow_ai_findings
  alter column tenant_id set default (current_user_org_id())::text;
drop policy if exists shadow_ai_findings_authenticated_only on public.shadow_ai_findings;
alter table public.shadow_ai_findings enable row level security;
drop policy if exists shadow_ai_findings_org_isolation on public.shadow_ai_findings;
create policy shadow_ai_findings_org_isolation on public.shadow_ai_findings
  for all
  using (tenant_id = (current_user_org_id())::text)
  with check (tenant_id = (current_user_org_id())::text);

-- ── executive_digests ───────────────────────────────────────────────────────
-- Board/exec digests summarise the whole estate; a cross-tenant read here would
-- disclose another organisation's governance posture in narrative form.
alter table public.executive_digests
  alter column tenant_id set default (current_user_org_id())::text;
drop policy if exists exec_digest_authenticated_read on public.executive_digests;
alter table public.executive_digests enable row level security;
drop policy if exists executive_digests_org_isolation on public.executive_digests;
create policy executive_digests_org_isolation on public.executive_digests
  for all
  using (tenant_id = (current_user_org_id())::text)
  with check (tenant_id = (current_user_org_id())::text);

-- ── Regression guard ────────────────────────────────────────────────────────
-- Re-run this after any RLS change. It must return zero rows: a real
-- tenant-scoped table must never carry a permissive policy without a tenant
-- predicate. (*_table demo tables are excluded — they have no tenant column at
-- all and are tracked as TD-001 in docs/reference/technical-debt.md.)
--
--   select p.tablename, p.policyname, p.cmd, p.qual
--   from pg_policies p
--   where p.schemaname='public'
--     and p.permissive='PERMISSIVE'
--     and p.tablename not like '%\_table'
--     and not (p.roles::text='{service_role}')
--     and coalesce(p.qual,'') not like '%org_id%'
--     and coalesce(p.qual,'') not like '%tenant_id%'
--     and coalesce(p.qual,'') not like '%auth.uid%'
--     and coalesce(p.qual,'') not like '%service_role%'
--     and p.cmd in ('SELECT','ALL')
--     and exists (select 1 from information_schema.columns c
--                 where c.table_schema='public' and c.table_name=p.tablename
--                   and c.column_name in ('org_id','tenant_id'));
