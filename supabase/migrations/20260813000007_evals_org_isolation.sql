-- Validation & Evals: close the tenancy hole. These tables shipped with
-- `using(true)` policies open to anon and an org_id column that nothing wrote,
-- while the service pinned tenant_id='default' — one shared bucket for every
-- org. Bring them onto the platform standard: org_id defaults to
-- current_user_org_id() and RLS enforces org isolation (same as ai_models).
-- Applied live via Supabase MCP on 2026-08-13.
do $$
declare t text;
        tables text[] := array[
          'validation_runs','explainability_profiles','bias_audit_records','metric_profiles',
          'dataset_catalog_entries','scenario_templates','scenario_campaigns','session_traces',
          'eval_monitoring_configs'
        ];
begin
  foreach t in array tables loop
    execute format('alter table public.%I alter column org_id set default current_user_org_id()::text', t);
    execute format($f$update public.%I set org_id = '00000000-0000-0000-0000-000000000001' where org_id is null or org_id = ''$f$, t);
    execute format('drop policy if exists %I on public.%I', t || '_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_org_all', t);
    execute format($f$create policy %I on public.%I for all to authenticated
                      using (org_id = current_user_org_id()::text)
                      with check (org_id = current_user_org_id()::text)$f$, t || '_org_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_service_role_all', t);
    execute format($f$create policy %I on public.%I for all to service_role using (true) with check (true)$f$, t || '_service_role_all', t);
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;
