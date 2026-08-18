-- 20260901000001_integration_connection_modes.sql
--
-- WHY
--
-- The catalogue publishes 219 evidence sources. Three of them ship an adapter
-- (`github`, `aws`, `microsoft_azure`); the other 216 could be browsed and
-- nothing more — no way to record which tenant is in scope, who owns it, or
-- when it is next reviewed. A governed source with no owner is not governed.
--
-- The obvious fix — render a credential form on all 219 — is the one thing we
-- must not do. Taking a secret for a product with no adapter collects nothing,
-- and creates a stored credential with no consumer. So a connection now has a
-- MODE:
--
--   automated  an adapter ships. Credentials are encrypted and a sync is
--              queued. Unchanged behaviour; this is what `integrations` has
--              always meant, hence the default.
--
--   manual     no adapter. The row records the source, its accountable owner,
--              its review cadence and where its evidence lives — and holds NO
--              credentials. It is real governance state (ISO/IEC 42001 §9.1
--              needs somebody accountable for looking) and it is honest about
--              collecting nothing on its own.
--
-- The load-bearing consequence is the cron guard below. `daily-integration-sync`
-- enqueues one job per integration `where status = 'connected'`. A manual row
-- has no credentials and no adapter, so a job for it can only fail and burn the
-- retry budget five times over. Both schedules therefore also require
-- `connection_mode = 'automated'`.
--
-- Idempotent. Safe to re-run.

-- ── 1. The mode itself ─────────────────────────────────────────────────────

alter table public.integrations
  add column if not exists connection_mode text not null default 'automated';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.integrations'::regclass
      and conname  = 'integrations_connection_mode_check'
  ) then
    alter table public.integrations
      add constraint integrations_connection_mode_check
      check (connection_mode in ('automated', 'manual'));
  end if;
end $$;

comment on column public.integrations.connection_mode is
  'automated = an adapter collects evidence from stored credentials; '
  'manual = a registered source with an accountable owner and a review '
  'cadence, holding no credentials and collecting nothing automatically.';

-- A manual connection must never carry a credential: there is no adapter to
-- decrypt it with, so storing one would be a liability with no consumer.
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.integrations'::regclass
      and conname  = 'integrations_manual_holds_no_credentials'
  ) then
    alter table public.integrations
      add constraint integrations_manual_holds_no_credentials
      check (connection_mode <> 'manual' or credentials_encrypted is null);
  end if;
end $$;

-- `status` has no CHECK constraint; 'monitored' joins the documented set so a
-- manual source is never mistaken for one that is collecting.
comment on column public.integrations.status is
  'connected | degraded | error | disconnected | configuring | monitored. '
  'monitored is the resting state of a connection_mode = manual row: '
  'registered and owned, collecting nothing automatically.';

create index if not exists integrations_connection_mode_idx
  on public.integrations (org_id, connection_mode)
  where is_deleted = false;

-- ── 2. Keep the sync scheduler off manual rows ─────────────────────────────
--
-- Re-schedules `daily-integration-sync` with the extra guard. Silent no-op
-- when pg_cron is absent (a from-zero replay has no extension), matching the
-- guard style in 20260825000001 and 20260825000006.

do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule('daily-integration-sync')
    where exists (select 1 from cron.job where jobname = 'daily-integration-sync');
    perform cron.schedule(
      'daily-integration-sync', '0 2 * * *',
      $job$
        insert into public.background_jobs (org_id, job_type, payload)
        select i.org_id, 'integration_sync',
               jsonb_build_object('org_id', i.org_id::text,
                                  'integration_id', i.id::text,
                                  'integration_slug', i.catalog_slug)
        from public.integrations i
        where i.status = 'connected'
          and i.connection_mode = 'automated'
          and i.is_deleted = false
          and i.catalog_slug is not null
          and i.credentials_encrypted is not null
          and not exists (
            select 1 from public.background_jobs j
            where j.job_type = 'integration_sync'
              and j.status in ('queued','running')
              and j.payload->>'integration_id' = i.id::text)
      $job$);
  end if;
end $$;

-- ── 3. Backfill ────────────────────────────────────────────────────────────
--
-- Anything already carrying credentials is automated by construction (the
-- connect path is the only writer of credentials_encrypted). Anything else
-- keeps the default. Stated explicitly so the intent survives the next reader.

update public.integrations
set connection_mode = 'automated'
where credentials_encrypted is not null
  and connection_mode <> 'automated';
