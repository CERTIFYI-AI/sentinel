-- SPDX-License-Identifier: Apache-2.0
-- Copyright (c) 2026 CERTIFYI-AI.
--
-- WHY: EU AI Act Art. 12 (record-keeping) and the repo's own review Gate 4
-- both require that changes to governed AI entities leave an audit record with
-- an actor. TD-018 found that `ai_models` -- the canonical model id-space the
-- product actually uses -- is written by `modelService.ts`, which makes NO
-- `logAction` call, and (verified against the live project) carries NO audit
-- trigger. Registering, editing, or deleting an AI model therefore left no
-- trace at all. `model_inventory` has a trigger in an old migration but is not
-- the table the product uses.
--
-- The TD-018 note assumed a shared `fn_audit_trigger` already existed to bolt
-- on in "three lines". It does not exist on the live database, and no function
-- anywhere writes into `audit_log`. This migration creates that function for
-- real, as the reusable, DB-level guarantee behind the app's fire-and-forget
-- `logAction`.
--
-- SCOPE: attached here to `ai_models` only. `use_cases`, `datasets` and `risks`
-- are scoped by a legacy `tenant_id text` column, NOT the `org_id uuid` model
-- that `audit_log` uses -- they cannot write a valid `audit_log.org_id` until
-- they are migrated onto `org_id`/`current_user_org_id()`. Bolting this trigger
-- onto them would silently drop every row (see the org guard below), which is
-- worse than an honest gap. That schema-unification prerequisite stays open in
-- TD-018; do NOT attach this trigger to a `tenant_id` table before it lands.
--
-- Idempotent: safe to replay from zero and safe to re-run on the live project.

-- ── Reusable audit-trigger function ─────────────────────────────────────────
-- Writes one append-only row into public.audit_log for every INSERT/UPDATE/
-- DELETE on an org_id-scoped, uuid-keyed table. SECURITY DEFINER so the write
-- always lands regardless of the writer's RLS grants on audit_log; org scoping
-- is preserved by copying org_id straight off the changed row (never from the
-- definer's context). Reads the actor from the *caller's* JWT -- auth.uid() /
-- auth.jwt() are STABLE reads of the current request, unaffected by DEFINER.
--
-- TG_ARGV[0] = module label, TG_ARGV[1] = entity_type label.
create or replace function public.fn_audit_governed()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  rec        jsonb := to_jsonb(coalesce(NEW, OLD));
  v_org      uuid;
  v_entity   uuid;
  v_name     text;
  v_action   text;
  v_module   text := coalesce(TG_ARGV[0], TG_TABLE_NAME);
  v_etype    text := coalesce(TG_ARGV[1], TG_TABLE_NAME);
begin
  -- org_id and id must resolve to real uuids, else we cannot scope the record.
  -- This guard is also the safety net that makes attaching the trigger to a
  -- non-org_id (e.g. tenant_id) table a no-op rather than a cross-tenant leak.
  begin
    v_org    := (rec->>'org_id')::uuid;
    v_entity := (rec->>'id')::uuid;
  exception when others then
    return coalesce(NEW, OLD);
  end;
  if v_org is null or v_entity is null then
    return coalesce(NEW, OLD);
  end if;

  v_name := coalesce(rec->>'name', rec->>'title');
  v_action := case TG_OP
                when 'INSERT' then 'create'
                when 'UPDATE' then 'update'
                when 'DELETE' then 'delete'
                else lower(TG_OP)
              end;

  insert into public.audit_log (
    org_id, actor_id, actor_name, actor_role,
    module, entity_type, entity_id, entity_name, action,
    old_values, new_values
  ) values (
    v_org,
    auth.uid(),
    -- Prefer the JWT email; fall back to 'System' for service-role / job writes
    -- so the actor column is never blank.
    coalesce(nullif(auth.jwt() ->> 'email', ''), 'System'),
    -- The DB cannot know the business role; leave it honest-null rather than
    -- guessing from the postgres/authenticated role.
    null,
    v_module,
    v_etype,
    v_entity,
    v_name,
    v_action,
    case when TG_OP = 'INSERT' then null else to_jsonb(OLD) end,
    case when TG_OP = 'DELETE' then null else to_jsonb(NEW) end
  );

  return coalesce(NEW, OLD);
end;
$$;

comment on function public.fn_audit_governed() is
  'Art.12 record-keeping: append-only audit_log writer for org_id-scoped, '
  'uuid-keyed governed tables. SECURITY DEFINER; no-op unless org_id and id '
  'resolve to uuids. Pass (module, entity_type) via CREATE TRIGGER args.';

-- This is a trigger function only -- it must never be reachable as a PostgREST
-- RPC. Supabase auto-grants EXECUTE on public functions to anon/authenticated,
-- which would expose a SECURITY DEFINER function at /rest/v1/rpc/. Revoke it;
-- triggers fire as the table owner regardless of caller EXECUTE grants, so the
-- audit path is unaffected. (Closes the advisor's
-- anon/authenticated_security_definer_function_executable warning.)
revoke all on function public.fn_audit_governed() from public, anon, authenticated;

-- ── Attach to ai_models ─────────────────────────────────────────────────────
drop trigger if exists trg_audit_ai_models on public.ai_models;
create trigger trg_audit_ai_models
  after insert or update or delete on public.ai_models
  for each row execute function public.fn_audit_governed('models', 'ai_model');
