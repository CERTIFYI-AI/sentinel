-- 20260825000004_enable_pg_cron_activate_schedules.sql
--
-- Mesh + integration schedules ACTIVATED. The 2026-08-25 consolidation audit
-- found the "always-on" governance mesh had never executed on live:
-- pg_cron was not installed, so 20260819000005 (mesh sweep) and
-- 20260825000001 §6 (integration sync enqueue) both silently no-oped, and
-- agent_executions / governance_events held zero rows despite 27 registered
-- agents and a deployed, ACTIVE governance-dispatcher edge function.
--
-- This migration makes the prerequisite real and re-runs both schedule
-- blocks. The dispatcher trigger (fn_dispatch_governance_event) needs no GUC
-- — it carries the functions URL and reads its auth key from vault. Only the
-- sweep job interpolates the URL at schedule time, so the GUC is set for
-- this session where the platform-level setting is not writable.
--
-- Applied live 2026-08-25; verified: cron.job shows mesh-sentinels-sweep
-- (*/10) and daily-integration-sync (02:00 UTC) both active.
-- Guarded: pg_cron is a Supabase platform extension and is not available in a
-- bare Postgres, where the bare CREATE EXTENSION aborts the replay (audit F1).
-- The schedule blocks below already take a guarded no-op path without it.
do $pgcron$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
  else
    raise notice 'pg_cron unavailable in this environment; schedules skipped';
  end if;
exception when insufficient_privilege then
  raise notice 'pg_cron available but current role lacks permission; schedules skipped';
end $pgcron$;

select set_config('app.settings.supabase_functions_url',
                  'https://vhparvughsygyknblkzt.supabase.co/functions/v1', false);

do $$
declare fn_url text;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_extension where extname = 'pg_net') then
    begin
      fn_url := current_setting('app.settings.supabase_functions_url', true);
    exception when others then fn_url := null; end;
    if fn_url is not null and fn_url <> '' then
      perform cron.unschedule('mesh-sentinels-sweep')
      where exists (select 1 from cron.job where jobname = 'mesh-sentinels-sweep');
      perform cron.schedule(
        'mesh-sentinels-sweep', '*/10 * * * *',
        format(
          $job$ select net.http_post(
                  url := %L,
                  headers := jsonb_build_object('Content-Type','application/json'),
                  body := jsonb_build_object('mode','sweep')) $job$,
          fn_url || '/governance-dispatcher'));
    end if;
  end if;
end $$;

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
               jsonb_build_object('org_id', i.org_id::text, 'integration_id', i.id::text, 'integration_slug', i.catalog_slug)
        from public.integrations i
        where i.status = 'connected' and i.is_deleted = false
          and i.catalog_slug is not null and i.credentials_encrypted is not null
          and not exists (select 1 from public.background_jobs j
            where j.job_type = 'integration_sync' and j.status in ('queued','running')
              and j.payload->>'integration_id' = i.id::text)
      $job$);
  end if;
end $$;
