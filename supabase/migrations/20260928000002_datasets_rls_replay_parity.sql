-- Why: the live database scopes `datasets` with policy `datasets_org`
-- (tenant_id = current_user_org_id()::text), but the repo lineage still
-- creates `allow_all_datasets` (USING true) in 20260418000002 and never
-- drops it. Permissive policies OR together, so a from-zero replay would
-- ship a datasets table readable and writable across orgs even with
-- datasets_org present. Drop the permissive policy and assert the scoped
-- one, bringing replays to parity with live. Idempotent; no-op on live.

drop policy if exists "allow_all_datasets" on public.datasets;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='datasets' and policyname='datasets_org') then
    create policy datasets_org on public.datasets
      for all using (tenant_id = (current_user_org_id())::text)
      with check (tenant_id = (current_user_org_id())::text);
  end if;
end $$;
