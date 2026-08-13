-- Close the anon exposure (64 tables had `for all to anon,authenticated
-- using(true)` policies, and 20260420_functional_integration.sql granted
-- blanket anon SELECT). Applied live via Supabase MCP on 2026-08-13.
-- Tables with an org_id column get org isolation; legacy doc tables with no
-- scoping column become authenticated-only. Org defaults added where missing.
do $$
declare r record; has_org boolean;
begin
  for r in
    select distinct tablename, policyname from pg_policies
    where schemaname='public' and 'anon' = any(roles) and qual='true'
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
    select exists(select 1 from information_schema.columns c
                  where c.table_schema='public' and c.table_name=r.tablename and c.column_name='org_id'
                    and c.data_type='uuid') into has_org;
    if has_org then
      execute format($f$create policy %I on public.%I for all to authenticated
        using (org_id = current_user_org_id()) with check (org_id = current_user_org_id())$f$,
        r.tablename || '_org_all', r.tablename);
    elsif exists(select 1 from information_schema.columns c
                 where c.table_schema='public' and c.table_name=r.tablename and c.column_name='org_id') then
      execute format($f$create policy %I on public.%I for all to authenticated
        using (org_id = current_user_org_id()::text) with check (org_id = current_user_org_id()::text)$f$,
        r.tablename || '_org_all', r.tablename);
    else
      execute format($f$create policy %I on public.%I for all to authenticated using (true) with check (true)$f$,
        r.tablename || '_authenticated_all', r.tablename);
    end if;
  end loop;
end $$;

revoke select on all tables in schema public from anon;
alter default privileges in schema public revoke select on tables from anon;

alter table public.protected_attribute_catalog alter column org_id set default current_user_org_id()::text;
alter table public.genai_risk_profiles alter column org_id set default current_user_org_id()::text;
alter table public.trust_config alter column org_id set default current_user_org_id()::text;
