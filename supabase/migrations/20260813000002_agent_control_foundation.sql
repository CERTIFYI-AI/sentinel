-- Agent Control foundation. Applied live via Supabase MCP on 2026-08-13.
-- 1) Org-scope the agent_gov doc tables (registry + credentials) like the evals
--    fix: org default + org-isolation RLS replacing the anon-open policy.
-- 2) Close anon-open policies on the legacy agents / shadow_ai_findings tables.
-- 3) Adopt the existing typed kill_switch_events and agent_workflows tables
--    (both pre-existed with org_id uuid): org default + org-isolation RLS.

do $$
declare t text;
begin
  foreach t in array array['agent_gov_registry','agent_gov_credentials'] loop
    execute format('alter table public.%I alter column org_id set default current_user_org_id()::text', t);
    execute format($f$update public.%I set org_id='00000000-0000-0000-0000-000000000001' where org_id is null or org_id=''$f$, t);
    execute format('drop policy if exists %I on public.%I', t || '_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_org_all', t);
    execute format($f$create policy %I on public.%I for all to authenticated
      using (org_id = current_user_org_id()::text) with check (org_id = current_user_org_id()::text)$f$, t || '_org_all', t);
    execute format('drop policy if exists %I on public.%I', t || '_service_role_all', t);
    execute format($f$create policy %I on public.%I for all to service_role using (true) with check (true)$f$, t || '_service_role_all', t);
  end loop;
end $$;

drop policy if exists agents_tenant_isolation on public.agents;
drop policy if exists agents_all on public.agents;
drop policy if exists agents_authenticated_only on public.agents;
create policy agents_authenticated_only on public.agents for all to authenticated using (true) with check (true);
drop policy if exists shadow_ai_findings_tenant_isolation on public.shadow_ai_findings;
drop policy if exists shadow_ai_findings_all on public.shadow_ai_findings;
drop policy if exists shadow_ai_findings_authenticated_only on public.shadow_ai_findings;
create policy shadow_ai_findings_authenticated_only on public.shadow_ai_findings for all to authenticated using (true) with check (true);

alter table public.kill_switch_events alter column org_id set default current_user_org_id();
update public.kill_switch_events set org_id='00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.kill_switch_events enable row level security;
drop policy if exists kill_switch_events_org_all on public.kill_switch_events;
drop policy if exists kill_switch_events_tenant_isolation on public.kill_switch_events;
create policy kill_switch_events_org_all on public.kill_switch_events for all to authenticated
  using (org_id = current_user_org_id()) with check (org_id = current_user_org_id());
drop policy if exists kill_switch_events_service_role_all on public.kill_switch_events;
create policy kill_switch_events_service_role_all on public.kill_switch_events for all to service_role using (true) with check (true);

alter table public.agent_workflows alter column org_id set default current_user_org_id();
update public.agent_workflows set org_id='00000000-0000-0000-0000-000000000001' where org_id is null;
alter table public.agent_workflows enable row level security;
drop policy if exists agent_workflows_org_all on public.agent_workflows;
drop policy if exists agent_workflows_tenant_isolation on public.agent_workflows;
drop policy if exists agent_workflows_all on public.agent_workflows;
create policy agent_workflows_org_all on public.agent_workflows for all to authenticated
  using (org_id = current_user_org_id()) with check (org_id = current_user_org_id());
drop policy if exists agent_workflows_service_role_all on public.agent_workflows;
create policy agent_workflows_service_role_all on public.agent_workflows for all to service_role using (true) with check (true);
