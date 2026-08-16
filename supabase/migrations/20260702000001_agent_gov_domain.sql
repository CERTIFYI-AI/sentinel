-- Agent governance: registry records + IAM credentials (doc-jsonb aggregate roots,
-- same uniform schema as the evals/validation domain).
-- Applied to project vhparvughsygyknblkzt (Sentinel v 1.0) on 2026-07-02.
do $$
declare t text;
  tbls text[] := array['agent_gov_registry','agent_gov_credentials'];
begin
  foreach t in array tbls loop
    execute format($f$
      create table if not exists public.%I (
        id          text primary key default gen_random_uuid()::text,
        tenant_id   text not null default 'default',
        org_id      text,
        doc         jsonb not null default '{}'::jsonb,
        state       text,
        model_id    text,
        deleted_at  timestamptz,
        deleted_by  text,
        version     integer not null default 1,
        created_at  timestamptz not null default now(),
        created_by  text,
        updated_at  timestamptz not null default now(),
        updated_by  text
      );
    $f$, t);
    execute format('create index if not exists %I on public.%I (tenant_id) where deleted_at is null;', 'idx_'||t||'_tenant', t);
    execute format('alter table public.%I enable row level security;', t);
    execute format($p$
      drop policy if exists %I on public.%I;
      create policy %I on public.%I for all
        to anon, authenticated using (true) with check (true);
    $p$, t||'_all', t, t||'_all', t);
  end loop;
end $$;
