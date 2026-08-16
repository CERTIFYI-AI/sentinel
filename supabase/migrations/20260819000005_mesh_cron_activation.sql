-- 20260819000005_mesh_cron_activation.sql
--
-- Re-attempt the mesh sweep schedule. The fleet migration (20260816000001)
-- guards on app.settings.supabase_functions_url, which is not provisioned on
-- a fresh project — so the cron block no-oped and "always-on" silently meant
-- "on-demand". Once the operator sets the GUC (see
-- docs/architecture/governance-mesh/ACTIVATION.md), applying THIS file
-- activates the 10-minute sweep. Idempotent; a silent no-op when pg_cron,
-- pg_net or the GUC are absent.
do $$
declare
  fn_url text;
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron')
     and exists (select 1 from pg_extension where extname = 'pg_net') then
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
      raise notice 'mesh-sentinels-sweep scheduled against %', fn_url;
    else
      raise notice 'mesh cron NOT scheduled: app.settings.supabase_functions_url is unset (see docs/architecture/governance-mesh/ACTIVATION.md)';
    end if;
  end if;
end$$;
