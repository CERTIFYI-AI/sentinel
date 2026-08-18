-- 20260901000003_organization_settings_writable.sql
--
-- WHY
--
-- The organisation's own name is the most-shown string in the product: 28
-- pages put it in their subtitle, the board report prints it on every page,
-- and the narrative engine writes it into prose an auditor reads. It must come
-- from the org row (single source of truth), and only an administrator may
-- change it — renaming the organisation rewrites what every report says the
-- company is called, which is an administrative act, not a preference.
--
-- LINEAGE-AGNOSTIC (see TD-020). This migration originally assumed one schema
-- lineage: a SELECT-only `ws02_org_self_read` policy on `organizations`, the
-- `auth.current_org_id()` / `auth.has_permission()` helpers, and an
-- `rbac_permissions` table. The live project has *none* of those — it governs
-- `organizations` with a single `organizations_isolation` policy
-- (`FOR ALL … id = get_user_org_id()`) and identifies admins with
-- `public.is_org_admin()` (role in owner/admin). Applying the original form to
-- live would error, and even patched it would stack a SECOND permissive UPDATE
-- policy over `organizations_isolation` — the TD-000 defect where permissive
-- policies OR-combine and the wider one wins.
--
-- So this detects which primitives exist and does the right thing on each:
--
--   * auth.has_permission lineage: add the admin-gated *permissive* UPDATE
--     policy, as before, because the base policy there grants SELECT only.
--
--   * otherwise (the live lineage, base policy already FOR ALL): AND-in an admin
--     gate with a *RESTRICTIVE* FOR UPDATE policy — restrictive policies
--     AND-combine, so the net effect is "id = get_user_org_id() AND
--     is_org_admin()" for UPDATE only, leaving SELECT/INSERT/DELETE untouched.
--     A non-admin (e.g. an auditor) can no longer rename the org.
--
-- Idempotent and safe to re-run on either lineage.

-- ── is_org_admin(): define/repair up front ─────────────────────────────────
-- Repairs a latent live bug and makes the helper available to the from-zero
-- lineage too (the repo never defined it — it was a live-only function). It was
-- SECURITY DEFINER with search_path='' yet referenced `user_profiles`
-- UNQUALIFIED, so every call raised "relation user_profiles does not exist" and
-- the function had in fact never worked (nothing referenced it, so it went
-- unnoticed). Schema-qualify the table, matching get_user_org_id(). A caller
-- with no profile row yields NULL, which RLS treats as false → denied.
create or replace function public.is_org_admin()
returns boolean
language sql
stable
security definer
set search_path to ''
as $$ select role in ('owner','admin') from public.user_profiles where id = auth.uid() $$;

-- ── The UPDATE policy, per lineage ──────────────────────────────────────────
do $$
declare
  has_perm_fn   boolean := exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                    where n.nspname = 'auth' and p.proname = 'has_permission');
  has_curorg_fn boolean := exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
                                    where n.nspname = 'auth' and p.proname = 'current_org_id');
  has_rbac      boolean := to_regclass('public.rbac_permissions') is not null;
begin
  if to_regclass('public.organizations') is null then
    raise notice 'organizations table absent — nothing to do';
    return;
  end if;

  execute 'alter table public.organizations enable row level security';

  if has_perm_fn and has_curorg_fn then
    -- Original lineage: base policy grants SELECT only; add the permissive,
    -- admin-gated UPDATE. Tenant + admin test in both USING and WITH CHECK so an
    -- admin can neither touch another tenant's row nor move their own org to
    -- another tenant's id.
    execute 'drop policy if exists org_self_update on public.organizations';
    execute $sql$
      create policy org_self_update on public.organizations
        for update to authenticated
        using       (id = auth.current_org_id() and auth.has_permission('org.update'))
        with check  (id = auth.current_org_id() and auth.has_permission('org.update'))
    $sql$;
    raise notice 'org update: permissive admin-gated policy installed (auth.has_permission lineage)';
  else
    -- Live lineage: base policy is FOR ALL and already permits the owner's
    -- UPDATE. Add a RESTRICTIVE FOR UPDATE gate so only owner/admin may write,
    -- without adding a second permissive policy (TD-000) and without touching
    -- reads.
    execute 'drop policy if exists org_update_admin_only on public.organizations';
    execute $sql$
      create policy org_update_admin_only on public.organizations
        as restrictive
        for update to authenticated
        using       (public.is_org_admin())
        with check  (public.is_org_admin())
    $sql$;
    raise notice 'org update: restrictive is_org_admin gate installed (live lineage)';
  end if;

  execute $c$comment on column public.organizations.name is
    'The organisation''s display name. Shown on 28 pages, in the board report and in generated narrative — this row is the single source of truth for it, not any client-side store. Editable by owner/admin only (RLS).'$c$;

  -- Record the permission where that table exists; org_admin already matches
  -- through its '*' grant, so this documents rather than changes access.
  if has_rbac then
    execute $ins$insert into public.rbac_permissions (role, permission)
             values ('org_admin', 'org.update') on conflict (role, permission) do nothing$ins$;
  end if;
end $$;
