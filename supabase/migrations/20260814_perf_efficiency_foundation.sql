-- Performance/Efficiency module foundation. Applied live via Supabase MCP 2026-08-14.
-- model_efficiency: joinable to the registry + client inserts can pass RLS.
alter table public.model_efficiency add column if not exists model_id uuid references public.ai_models(id) on delete set null;
alter table public.model_efficiency alter column org_id set default current_user_org_id();
drop policy if exists model_efficiency_tenant on public.model_efficiency;
create policy model_efficiency_org_all on public.model_efficiency for all to authenticated
  using (org_id = current_user_org_id()) with check (org_id = current_user_org_id());
-- model_performance_metrics: org default so client-side inserts work too.
alter table public.model_performance_metrics alter column org_id set default current_user_org_id();
-- Backfill model_id where an efficiency row's name matches the registry.
update public.model_efficiency me set model_id = am.id
from public.ai_models am
where me.model_id is null and lower(am.name) = lower(me.model_name);
