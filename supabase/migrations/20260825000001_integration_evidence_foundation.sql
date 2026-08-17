-- 20260825000001_integration_evidence_foundation.sql
--
-- Continuous-GRC integration evidence pipeline: the durable, server-side path
-- that turns a connected provider (GitHub, Okta, AWS, ...) into control
-- evidence a reader can audit.
--
--   integration_catalog   what CAN be connected (reference data, seeded from
--                         the Continuous GRC & AI Integrations master sheet
--                         in 20260825000002)
--   integrations          what IS connected per org (existing canonical
--                         table — extended here, never duplicated)
--   background_jobs       durable job queue claimed by the Python worker
--                         (sentinel/integrations/worker.py) with
--                         FOR UPDATE SKIP LOCKED
--   integration_findings  normalized check results per provider sync
--   control_finding_evidence
--                         which finding evidences which control — the
--                         interlink that makes a control's posture citable
--
-- Design decisions that differ from the generic pattern this was specced from:
--   * `integrations` already exists (20260816000003) with org_id defaulting
--     to current_user_org_id() — it is EXTENDED with credential/sync columns,
--     not recreated. The unique key is (org_id, provider) on live rows.
--   * controls.status is a human-owned implementation state
--     ('not_implemented' → 'implemented'); automated evidence must not
--     overwrite a human attestation. Evidence posture is therefore computed
--     into controls.automation_status / evidence_count / last_tested_at and
--     exposed via the control_evidence_posture view — a separate, honest
--     dimension, not a silent rewrite of the human field.
--   * No NOT NULL DEFAULT current_user_org_id() on populated tables — that
--     resolver returns NULL in the admin apply context and the ALTER aborts
--     (the exact failure that voided the first demo-table containment).
--
-- Applied live to Supabase project vhparvughsygyknblkzt on 2026-08-25.

-- ── 1. Catalog: what can be connected ───────────────────────────────────────

create table if not exists public.integration_catalog (
  slug             text primary key,            -- 'github', 'okta', 'aws_bedrock'
  name             text not null,
  category         text not null,               -- hr|identity|code|cloud|device|security|siem|secrets|cicd|ticketing|training|collaboration|saas|hiring|ai
  why_needed       text,                        -- what evidence this source carries
  evidence_pull    text,                        -- how evidence is pulled (API/OAuth/SCIM...)
  connect_steps    text,                        -- operator connection walkthrough
  evidence_mapping text,                        -- what maps to which evidence entities
  docs_hint        text,                        -- where the provider's own docs live
  tier             int  not null default 3,     -- 1 = adapter shipped, 2 = planned next, 3 = catalogued
  adapter_status   text not null default 'catalogued'
    check (adapter_status in ('available','beta','catalogued')),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

alter table public.integration_catalog enable row level security;

-- Reference data: readable by any signed-in user, writable only by service role.
drop policy if exists integration_catalog_read on public.integration_catalog;
create policy integration_catalog_read on public.integration_catalog
  for select to authenticated using (true);
drop policy if exists integration_catalog_service on public.integration_catalog;
create policy integration_catalog_service on public.integration_catalog
  for all to service_role using (true) with check (true);

-- ── 2. Extend the existing org integrations table ──────────────────────────

alter table public.integrations
  add column if not exists catalog_slug          text references public.integration_catalog(slug),
  -- AES-256-GCM blob written by the FastAPI backend; the browser never sees
  -- plaintext and never decrypts. Shape: {v, nonce, ciphertext} base64.
  add column if not exists credentials_encrypted jsonb,
  add column if not exists last_run_status       text
    check (last_run_status in ('success','error','partial','running')),
  add column if not exists last_run_error        text;

create unique index if not exists integrations_org_catalog_unique
  on public.integrations (org_id, catalog_slug)
  where catalog_slug is not null and is_deleted = false;

-- ── 3. Durable job queue ───────────────────────────────────────────────────

create table if not exists public.background_jobs (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null,
  job_type      text not null,                  -- 'integration_sync'
  payload       jsonb not null default '{}'::jsonb,
  status        text not null default 'queued'
    check (status in ('queued','running','completed','failed')),
  attempts      int  not null default 0,
  max_attempts  int  not null default 5,
  available_at  timestamptz not null default now(),
  locked_at     timestamptz,
  locked_by     text,
  last_error    text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists background_jobs_claim_idx
  on public.background_jobs (job_type, available_at)
  where status = 'queued';
create index if not exists background_jobs_org_idx
  on public.background_jobs (org_id, created_at desc);

alter table public.background_jobs enable row level security;

-- Org members may observe their own jobs (sync status UI); only the service
-- role (worker, pg_cron enqueue) writes. No client insert path: enqueueing is
-- a privileged operation.
drop policy if exists background_jobs_org_read on public.background_jobs;
create policy background_jobs_org_read on public.background_jobs
  for select to authenticated using (org_id = current_user_org_id());
drop policy if exists background_jobs_service on public.background_jobs;
create policy background_jobs_service on public.background_jobs
  for all to service_role using (true) with check (true);

-- ── 4. Findings ────────────────────────────────────────────────────────────

create table if not exists public.integration_findings (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null default current_user_org_id(),
  integration_id  uuid not null references public.integrations(id) on delete cascade,
  check_id        text not null,                -- stable: 'github.org.mfa_required'
  title           text not null,
  description     text not null,
  remediation     text not null,
  status          text not null check (status in ('PASSED','FAILED','WARNING','NOT_AVAILABLE')),
  severity        text not null check (severity in ('CRITICAL','HIGH','MEDIUM','LOW','INFO')),
  check_category  text not null,                -- drives control mapping
  -- Raw provider payload for the audit trail; rendered to users only through
  -- the normalized fields above, never verbatim.
  result_details  jsonb not null default '{}'::jsonb,
  collected_at    timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

create unique index if not exists integration_findings_unique_check
  on public.integration_findings (integration_id, check_id);
create index if not exists integration_findings_org_idx
  on public.integration_findings (org_id, check_category);

alter table public.integration_findings enable row level security;

drop policy if exists integration_findings_org_read on public.integration_findings;
create policy integration_findings_org_read on public.integration_findings
  for select to authenticated using (org_id = current_user_org_id());
drop policy if exists integration_findings_service on public.integration_findings;
create policy integration_findings_service on public.integration_findings
  for all to service_role using (true) with check (true);

-- ── 5. Control evidence interlink ──────────────────────────────────────────

create table if not exists public.control_finding_evidence (
  id                     uuid primary key default gen_random_uuid(),
  org_id                 uuid not null,
  control_id             uuid not null references public.controls(id) on delete cascade,
  integration_finding_id uuid references public.integration_findings(id) on delete cascade,
  status                 text not null,          -- finding status at mapping time
  mapped_at              timestamptz not null default now(),
  unique (control_id, integration_finding_id)
);

create index if not exists control_finding_evidence_org_idx
  on public.control_finding_evidence (org_id, control_id);

alter table public.control_finding_evidence enable row level security;

drop policy if exists control_finding_evidence_org_read on public.control_finding_evidence;
create policy control_finding_evidence_org_read on public.control_finding_evidence
  for select to authenticated using (org_id = current_user_org_id());
drop policy if exists control_finding_evidence_service on public.control_finding_evidence;
create policy control_finding_evidence_service on public.control_finding_evidence
  for all to service_role using (true) with check (true);

-- Evidence posture per control, kept apart from the human-owned
-- controls.status. 'failing' here means automated evidence contradicts the
-- control; it does not overwrite an implementation attestation.
create or replace view public.control_evidence_posture as
select
  cfe.org_id,
  cfe.control_id,
  count(*)                                        as findings_linked,
  count(*) filter (where f.status = 'PASSED')     as findings_passed,
  count(*) filter (where f.status = 'FAILED')     as findings_failed,
  max(f.collected_at)                             as last_evidence_at,
  case
    when count(*) filter (where f.status = 'FAILED'
                          and f.severity in ('CRITICAL','HIGH')) > 0 then 'failing'
    when count(*) filter (where f.status = 'FAILED') > 0            then 'needs_review'
    when count(*) filter (where f.status = 'PASSED') > 0            then 'passing'
    else 'no_evidence'
  end as posture
from public.control_finding_evidence cfe
join public.integration_findings f on f.id = cfe.integration_finding_id
group by cfe.org_id, cfe.control_id;

-- Roll automated-evidence facts into the columns controls already carries for
-- them. security definer so the worker (service role) can run it; scoped to
-- one org per call.
create or replace function public.recompute_control_evidence(p_org_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.controls c
  set evidence_count    = coalesce(p.findings_linked, 0),
      automation_status = case when p.findings_linked > 0 then 'automated'
                               else c.automation_status end,
      last_tested_at    = coalesce(p.last_evidence_at::date, c.last_tested_at),
      updated_at        = now()
  from public.control_evidence_posture p
  where p.control_id = c.id
    and p.org_id = p_org_id
    and c.org_id = p_org_id;
end;
$$;

-- ── 6. Daily enqueue via pg_cron (guarded like the mesh sweep) ─────────────
--
-- Enqueues one sync job per active, credentialed integration at 02:00 UTC.
-- Silent no-op when pg_cron is absent (fresh replay in CI has no extension).
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('daily-integration-sync')
    where exists (select 1 from cron.job where jobname = 'daily-integration-sync');
    perform cron.schedule(
      'daily-integration-sync',
      '0 2 * * *',
      $job$
        insert into public.background_jobs (org_id, job_type, payload)
        select i.org_id, 'integration_sync',
               jsonb_build_object(
                 'org_id',           i.org_id::text,
                 'integration_id',   i.id::text,
                 'integration_slug', i.catalog_slug)
        from public.integrations i
        where i.status = 'connected'
          and i.is_deleted = false
          and i.catalog_slug is not null
          and i.credentials_encrypted is not null
          and not exists (
            select 1 from public.background_jobs j
            where j.job_type = 'integration_sync'
              and j.status in ('queued','running')
              and j.payload->>'integration_id' = i.id::text)
      $job$
    );
  end if;
end $$;
