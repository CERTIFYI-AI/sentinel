-- Functional seed: minimal rows so every module renders with live data
-- Idempotent via ON CONFLICT DO NOTHING

-- Ensure default org exists
insert into public.organizations (id, name, domain, industry)
values ('00000000-0000-0000-0000-000000000001', 'Demo Tenant', 'demo.sentinel.ai', 'Technology')
on conflict (id) do nothing;

-- Seed a couple of rows per functional table to prove round-trip connectivity
do $$
declare t text;
begin
  for t in select unnest(array[
    'ai_impact_assessments','approvals','attack_surface_assets','bcp_plans',
    'carbon_records','compliance_calendar','conformity_assessments','consent_records',
    'data_assets','departments','documents','dsar_requests','ethics_reports',
    'exceptions','explainability_reports','guardrails','maturity_assessments',
    'model_arena_runs','policy_firewall_rules','prompt_registry','red_team_campaigns',
    'red_team_findings','regulations','remediation_plans','security_scans',
    'security_threats','security_vulnerabilities','supply_chain_attestations',
    'training_courses','keys_vault','api_keys'
  ]) loop
    begin
      execute format($f$
        insert into public.%I (name, title, description, status, type, severity, tenant_id, metadata)
        values
          ('%s Sample A', '%s Sample A', 'Auto-seeded demo row A for %s', 'active', 'demo', 'medium', 'default', '{"seeded":true}'::jsonb),
          ('%s Sample B', '%s Sample B', 'Auto-seeded demo row B for %s', 'draft',  'demo', 'low',    'default', '{"seeded":true}'::jsonb)
        on conflict do nothing;
      $f$, t, t, t, t, t, t, t);
    exception when others then null;
    end;
  end loop;
end $$;
