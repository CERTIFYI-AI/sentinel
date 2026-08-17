-- Validation & Evals domain: aggregate-root tables (children embedded in doc jsonb).
-- Uniform schema: text PK (business ids like VAL-2026-008), tenant scoping,
-- soft-delete, optimistic-lock version, audit columns.
-- Applied to project vhparvughsygyknblkzt (Sentinel v 1.0) on 2026-07-02.

do $$
declare t text;
  tbls text[] := array[
    'validation_runs','explainability_profiles','bias_audit_records','metric_profiles',
    'dataset_catalog_entries','scenario_templates','scenario_campaigns','session_traces',
    'protected_attribute_catalog','eval_monitoring_configs'
  ];
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
    -- Demo posture: single-tenant "default"; anon + authenticated full access on these new tables only.
    execute format($p$
      drop policy if exists %I on public.%I;
      create policy %I on public.%I for all
        to anon, authenticated using (true) with check (true);
    $p$, t||'_all', t, t||'_all', t);
  end loop;
end $$;
