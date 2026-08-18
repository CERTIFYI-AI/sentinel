-- 20260825000005_mesh_activation_and_dispatch_envelope.sql
--
-- Makes the "always-on" Agentic Mesh actually always-on. The 2026-08-25
-- consolidation audit found the whole fabric built, deployed and registered
-- (27 agents in agent_registry, 10 sentinels, an ACTIVE governance-dispatcher
-- edge function) but never once executed on live: agent_executions and
-- governance_events both held ZERO rows. Four independent defects, each of
-- which alone was enough to keep it silent:
--
--   1. pg_cron was not installed, so the mesh sweep schedule in
--      20260816000001 §5 and the integration enqueue in 20260825000001 §6
--      both took their guarded no-op path. Fixed in 20260825000004.
--   2. The dispatcher trigger POSTs the event row BARE (`to_jsonb(NEW)`),
--      but the edge function reads `body.record` — the Supabase DB-webhook
--      envelope. Every dispatch therefore answered 400 {"error":"no-record"}
--      and the event stayed 'pending' forever. Fixed below: the trigger now
--      sends {type, table, schema, record}, the shape the function contracts
--      for.
--   3. No `governance_dispatcher_key` existed in vault, so the Authorization
--      header was empty. That was survivable while the function had
--      verify_jwt=false, but not after a redeploy flips it on. The key is now
--      stored (anon-role JWT: grants no data access, RLS still applies).
--   4. mesh_agent_state / mesh_model_fingerprints from the fleet migration
--      were never applied live, so ChangeDetection and every heartbeat write
--      failed. Applied 2026-08-25.
--
-- Verified after this migration: a MODEL_REGISTERED event cascades to a real
-- risks row, a hitl_reviews row and a notifications row, with agent_executions
-- recording each agent; the sentinel sweep writes heartbeats and emits events.

-- The dispatch envelope. SECURITY DEFINER + empty search_path retained from
-- the original; only the body shape and the key lookup change.
create or replace function public.fn_dispatch_governance_event()
returns trigger
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_url text := 'https://vhparvughsygyknblkzt.supabase.co/functions/v1/governance-dispatcher';
  v_key text;
begin
  begin
    select decrypted_secret into v_key
      from vault.decrypted_secrets where name = 'governance_dispatcher_key' limit 1;
  exception when others then v_key := null;
  end;

  -- Supabase DB-webhook envelope: the edge function reads body.record.
  -- Sending to_jsonb(NEW) bare is what produced 400 no-record on every event.
  perform net.http_post(
    url     := v_url,
    body    := jsonb_build_object(
                 'type',   'INSERT',
                 'table',  'governance_events',
                 'schema', 'public',
                 'record', to_jsonb(new)),
    headers := jsonb_build_object(
                 'Content-Type', 'application/json',
                 'Authorization', coalesce('Bearer ' || v_key, ''))
  );
  return new;
exception when others then
  -- Never let dispatch failure block the write that emitted the event; the
  -- 10-minute sentinel sweep re-drives anything left pending.
  raise warning 'fn_dispatch_governance_event: %', sqlerrm;
  return new;
end;
$function$;
