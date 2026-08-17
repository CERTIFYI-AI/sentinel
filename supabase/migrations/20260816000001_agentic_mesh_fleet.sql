-- 20260816000001_agentic_mesh_fleet.sql
--
-- Agentic Mesh — continuous sentinel fleet foundation.
--
-- The platform already runs a *reactive* governance mesh: 27 cascade agents
-- triggered by business events on the governance_events bus (see
-- 20260421000001_autonomous_governance_mesh.sql). This migration adds the
-- *continuous* layer: 10 always-on sentinel agents that sweep org data on an
-- interval, intercept problems, and emit events into the SAME bus so the
-- existing cascades fire. One mesh, two run modes.
--
--   * agent_registry gains fleet columns (run_mode, problem/solution copy,
--     sweep interval) and 10 seeded sentinel rows (global catalog, org_id-less
--     like the 27 cascade agent rows).
--   * mesh_agent_state       — per-org runtime state: enable/pause, heartbeat,
--                              last sweep status/findings. RLS org-isolated.
--   * mesh_model_fingerprints — ChangeDetection's seen-hash per model so
--                              version/config changes are detected exactly once.
--   * Guarded pg_cron + pg_net schedule invoking the mesh-sentinels edge
--     function every 10 minutes (no-op where extensions are absent; the UI
--     "Run sweep" and client fallback keep the mesh functional regardless).
--
-- Idempotent: safe to re-apply.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Fleet columns on agent_registry (catalog of ALL agents, both run modes)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.agent_registry
  add column if not exists run_mode               text    default 'event',
  add column if not exists enterprise_problem     text,
  add column if not exists agentic_solution       text,
  add column if not exists sweep_interval_minutes integer default 15;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'agent_registry_run_mode_chk'
  ) then
    alter table public.agent_registry
      add constraint agent_registry_run_mode_chk
      check (run_mode in ('event', 'continuous'));
  end if;
end$$;

create index if not exists idx_agent_registry_run_mode
  on public.agent_registry(run_mode);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Per-org sentinel runtime state (heartbeats are per tenant, the catalog
--    row is global — never store runtime state on the shared catalog row)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.mesh_agent_state (
  id                   uuid primary key default gen_random_uuid(),
  org_id               uuid not null default current_user_org_id(),
  agent_name           text not null,
  is_enabled           boolean not null default true,
  last_heartbeat_at    timestamptz,
  last_sweep_status    text check (last_sweep_status in ('succeeded','failed','skipped') or last_sweep_status is null),
  last_findings_count  integer not null default 0,
  total_sweeps         bigint  not null default 0,
  consecutive_failures integer not null default 0,
  updated_at           timestamptz not null default now(),
  unique (org_id, agent_name)
);

alter table public.mesh_agent_state enable row level security;
drop policy if exists mesh_agent_state_org_isolation on public.mesh_agent_state;
create policy mesh_agent_state_org_isolation on public.mesh_agent_state
  for all to authenticated
  using (org_id = current_user_org_id())
  with check (org_id = current_user_org_id());
drop policy if exists mesh_agent_state_service_role_all on public.mesh_agent_state;
create policy mesh_agent_state_service_role_all on public.mesh_agent_state
  for all to service_role using (true) with check (true);

create index if not exists idx_mesh_agent_state_org on public.mesh_agent_state(org_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Model fingerprints for the ChangeDetection sentinel
--    (hash of version/provider/config per ai_models.id — uuid id-space)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.mesh_model_fingerprints (
  id           uuid primary key default gen_random_uuid(),
  org_id       uuid not null default current_user_org_id(),
  model_id     uuid not null,
  fingerprint  text not null,
  version_seen text,
  seen_at      timestamptz not null default now(),
  unique (org_id, model_id)
);

alter table public.mesh_model_fingerprints enable row level security;
drop policy if exists mesh_model_fingerprints_org_isolation on public.mesh_model_fingerprints;
create policy mesh_model_fingerprints_org_isolation on public.mesh_model_fingerprints
  for all to authenticated
  using (org_id = current_user_org_id())
  with check (org_id = current_user_org_id());
drop policy if exists mesh_model_fingerprints_service_role_all on public.mesh_model_fingerprints;
create policy mesh_model_fingerprints_service_role_all on public.mesh_model_fingerprints
  for all to service_role using (true) with check (true);

create index if not exists idx_mesh_fingerprints_org on public.mesh_model_fingerprints(org_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Seed the 10 continuous sentinels into agent_registry (global catalog).
--    WHERE NOT EXISTS keeps re-application idempotent even without a unique
--    constraint on agent_name.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  s record;
begin
  for s in
    select * from (values
      ('PolicyEnforcement', 'security', 15, 1,
       array['TRACE_FLAGGED','MODEL_REGISTERED'], array['trust_traces','guardrail_rules','risks'],
       'Validates model behaviour against active policies in real time, blocking malicious payloads before execution.',
       'LLMs bypass traditional firewalls, exposing enterprises to prompt injection and data exfiltration.',
       'Sweeps runtime trust traces for injection / PII / toxicity flags, correlates with enabled guardrail rules, and escalates breaches as risks on the event bus.'),
      ('DriftDetection', 'monitor', 30, 1,
       array['MODEL_UPDATED'], array['ai_models','risks'],
       'Monitors model output distribution for statistical and conceptual drift, alerting teams before impact.',
       'Models silently degrade over time, leading to inaccurate outputs that go unnoticed by humans.',
       'Continuously evaluates registry drift scores and statuses, emitting DRIFT_DETECTED for degrading models so the risk cascade fires before users notice.'),
      ('BiasMonitor', 'fairness', 60, 2,
       array['FAIRNESS_SCAN_COMPLETED'], array['bias_audits','ai_models'],
       'Runs continuous fairness testing across protected attributes to ensure equitable model performance.',
       'Unchecked models can generate biased outcomes, leading to reputational damage and regulatory fines.',
       'Watches fairness scores and audit recency; queues bias audits for uncovered or low-scoring models and raises fairness risks.'),
      ('DataLineage', 'data', 120, 3,
       array['DATA_GOVERNANCE_CHECK'], array['datasets','ai_models'],
       'Tracks training data provenance cryptographically and verifies consent validity continuously.',
       'Training data provenance is often lost, making it impossible to prove consent or copyright compliance.',
       'Verifies every PII dataset has a fresh audit trail and every production model has documented dataset lineage; gaps become governance events.'),
      ('IncidentTriage', 'incident', 10, 1,
       array['INCIDENT_CREATED'], array['incidents'],
       'Auto-classifies and correctly routes governance incidents with full LLM execution context.',
       'Security teams are overwhelmed by false-positive AI alerts and lack context to resolve them.',
       'Sweeps open incidents lacking severity or an assignee, classifies them P0–P4 with the platform taxonomy, and flags SLA breaches on stale criticals.'),
      ('ComplianceCheck', 'compliance', 60, 2,
       array['COMPLIANCE_UPDATED'], array['controls','ai_models'],
       'Automatically maps active controls to compliance frameworks and flags control gaps in real-time.',
       'Mapping dynamic AI controls to static frameworks (ISO, NIST) is a massive manual effort.',
       'Cross-references regulated / high-tier models against implemented framework controls and emits CONTROL_GAP_FOUND for uncovered obligations.'),
      ('AccessAudit', 'iam', 60, 2,
       array['VENDOR_LINKED'], array['agent_gov_credentials','agents'],
       'Reviews RBAC assignments and detects potential privilege escalation paths before agents act.',
       'Agents executing actions on behalf of users can accidentally escalate privileges across systems.',
       'Audits agent credentials for expiry, wildcard scopes and admin roles, and catches active agents that skipped governance review.'),
      ('Explainability', 'explainability', 120, 3,
       array['MODEL_REGISTERED'], array['model_explanations','ai_models'],
       'Generates accessible, human-readable model decision summaries for audit logs.',
       'Black-box models make decisions that compliance and legal teams cannot interpret or defend.',
       'Tracks explanation coverage per model version; models without a current SHAP/LIME record are queued for explainability review.'),
      ('ChangeDetection', 'devops', 30, 1,
       array['MODEL_UPDATED'], array['ai_models','mesh_model_fingerprints'],
       'Detects model version changes via API hashing and automatically triggers reassessments.',
       'Shadow AI models are updated via API without security review, bypassing governance gates.',
       'Fingerprints every registered model (version + provider + config hash); on change, emits MODEL_UPDATED and queues reassessment of bias and risk.'),
      ('Reporting', 'reporting', 1440, 5,
       array['*'], array['notifications','governance_events'],
       'Compiles scheduled compliance reports and risk exposure metrics for key stakeholders.',
       'Board members and executives lack visibility into the overall AI risk posture of the enterprise.',
       'Aggregates mesh activity, open risks and incident posture into a scheduled digest for executives — real counts, never invented metrics.')
    ) as v(agent_name, agent_type, interval_min, priority, trigger_events, target_modules, solution, problem, description)
  loop
    if not exists (select 1 from public.agent_registry ar where ar.agent_name = s.agent_name) then
      insert into public.agent_registry
        (agent_name, agent_type, trigger_events, target_modules, priority, sla_ms,
         description, owner_team, status, run_mode, enterprise_problem,
         agentic_solution, sweep_interval_minutes, is_enabled)
      values
        (s.agent_name, s.agent_type, s.trigger_events, s.target_modules, s.priority, 15000,
         s.description, 'governance-mesh', 'active', 'continuous', s.problem,
         s.solution, s.interval_min, true);
    else
      update public.agent_registry ar set
        run_mode               = 'continuous',
        enterprise_problem     = s.problem,
        agentic_solution       = s.solution,
        sweep_interval_minutes = s.interval_min,
        description            = coalesce(ar.description, s.description)
      where ar.agent_name = s.agent_name;
    end if;
  end loop;
end$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Always-on scheduling: pg_cron → pg_net POST to the mesh-sentinels edge
--    function every 10 minutes. Guarded so environments without the
--    extensions (local dev) apply cleanly; there the client runner and the
--    UI "Run sweep" action drive the fleet instead.
-- ─────────────────────────────────────────────────────────────────────────────
do $$
declare
  fn_url text;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_extension where extname = 'pg_net') then

    -- Project ref is resolvable from app settings on hosted Supabase; fall
    -- back to a vault-style setting when present. Skip silently when not.
    begin
      fn_url := current_setting('app.settings.supabase_functions_url', true);
    exception when others then
      fn_url := null;
    end;

    if fn_url is not null and fn_url <> '' then
      perform cron.unschedule('mesh-sentinels-sweep')
      where exists (select 1 from cron.job where jobname = 'mesh-sentinels-sweep');

      perform cron.schedule(
        'mesh-sentinels-sweep',
        '*/10 * * * *',
        format(
          $job$ select net.http_post(
                  url     := %L,
                  headers := jsonb_build_object('Content-Type','application/json'),
                  body    := '{"source":"pg_cron"}'::jsonb
                ); $job$,
          fn_url || '/mesh-sentinels'
        )
      );
    end if;
  end if;
end$$;
