-- 20260901000003_organization_settings_writable.sql
--
-- WHY
--
-- The organisation's own name is the most-shown string in the product: 28
-- pages put it in their subtitle, the board report prints it on every page,
-- and the narrative engine writes it into prose an auditor reads. Until now it
-- came from a **hardcoded default in a browser localStorage store**
-- (`dashboard/src/stores/settingsStore.ts`, `orgName: 'Sentinel Financial
-- Corp'`). Three things were wrong with that:
--
--   1. Every tenant saw the same name until somebody typed over it, and the
--      value never left that one browser — a second device, or the same user
--      after clearing site data, was back to the demo company's name.
--   2. Settings → General rendered `defaultValue="CertifyI"` with a Save
--      button wired to nothing. It looked like the setting existed.
--   3. `organizations` already had every one of those columns — name, domain,
--      industry, company_size, primary_contact, timezone, fiscal_year_start
--      (006_core and 20260421000003) — and the product never read them.
--
-- So the org row becomes the single source of truth. The blocker was RLS:
-- `ws02_org_self_read` (20260421000014) grants authenticated **SELECT only**,
-- so a save would have failed at the database with a policy error the operator
-- could do nothing about.
--
-- WHAT THIS DOES
--
-- Adds the missing UPDATE policy, scoped two ways:
--
--   * `id = auth.current_org_id()` — you can only ever rename your own
--     organisation, never another tenant's.
--   * `auth.has_permission('org.update')` — renaming the organisation changes
--     what every report and every exported PDF says the company is called.
--     That is an administrative act, not a preference. Today only `org_admin`
--     satisfies it (via the `'*'` grant in 20260421000018); no other role is
--     given it here, deliberately.
--
-- Both are repeated in USING and WITH CHECK: USING decides which row you may
-- touch, WITH CHECK decides what it may look like afterwards. Omitting the
-- second would let an admin move their organisation to another tenant's id.
--
-- No column is added — they all already exist. Idempotent; safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'organizations' and c.relkind = 'r'
  ) then
    raise notice 'organizations table absent — nothing to do';
    return;
  end if;

  execute 'alter table public.organizations enable row level security';

  -- Replaced rather than added to, so re-running cannot leave two policies
  -- whose PERMISSIVE union is wider than either alone — the defect class
  -- recorded as TD-000.
  execute 'drop policy if exists org_self_update on public.organizations';
  execute $sql$
    create policy org_self_update on public.organizations
      for update to authenticated
      using       (id = auth.current_org_id() and auth.has_permission('org.update'))
      with check  (id = auth.current_org_id() and auth.has_permission('org.update'));
  $sql$;
end $$;

comment on column public.organizations.name is
  'The organisation''s display name. Shown on 28 pages, in the board report '
  'and in generated narrative — this row is the single source of truth for it, '
  'not any client-side store.';

-- `org.update` is checked by the policy above; recording it against org_admin
-- makes the permission discoverable in rbac_permissions rather than existing
-- only as a string inside a policy. org_admin already matches through its '*'
-- grant, so this changes no access — it documents it.
insert into public.rbac_permissions (role, permission)
values ('org_admin', 'org.update')
on conflict (role, permission) do nothing;
