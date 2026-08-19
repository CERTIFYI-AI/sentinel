-- ---------------------------------------------------------------------------
-- 20260920000001 — SECURITY DEFINER hardening (audit findings L1, L2)
--
-- WHY: the second-pass security review found two SECURITY DEFINER surfaces
-- that the earlier RLS sweeps did not cover. Both are low severity but are the
-- exact classes we already fixed elsewhere, so we close them here.
--
--   L1. public.fn_audit_trigger() — the Art. 12 audit-log writer fired on ~11
--       governance tables — is the ONLY definer function in the migration set
--       without a pinned search_path. Running under the caller's search_path
--       lets a shadowing schema hijack unqualified built-ins (to_jsonb,
--       current_setting) with definer rights. `authenticated` holds only USAGE
--       (not CREATE) on public today, which is why this stayed low — but pin it
--       so the hardening does not depend on that grant never changing.
--
--   L2. public.recompute_control_evidence(uuid) — SECURITY DEFINER, and Postgres
--       auto-grants EXECUTE to PUBLIC — takes the org to recompute as a caller
--       argument with no `p_org_id = current_user_org_id()` guard, so any
--       authenticated user could drive a write against another org's controls.
--       Its only real caller is the integrations worker on a privileged DB
--       connection (sentinel/integrations/worker.py), never an end-user RPC, so
--       we simply remove EXECUTE from the PostgREST-exposed roles rather than
--       add a per-call guard the worker would then have to satisfy.
--
-- Idempotent and lineage-agnostic: each change is guarded on the object
-- actually existing, so this replays from zero and applies to the live DB.
-- ---------------------------------------------------------------------------

-- L1 — pin the audit trigger's search_path.
do $$
begin
  if to_regprocedure('public.fn_audit_trigger()') is not null then
    execute 'alter function public.fn_audit_trigger() set search_path = public, pg_catalog';
  end if;
end $$;

-- L2 — take recompute_control_evidence off the client-reachable roles; keep it
-- available to the privileged worker path (service_role / direct DB owner).
do $$
begin
  if to_regprocedure('public.recompute_control_evidence(uuid)') is not null then
    execute 'revoke execute on function public.recompute_control_evidence(uuid) from public';
    -- REVOKE FROM PUBLIC does not cascade to roles holding a direct grant, so
    -- strip the two PostgREST roles explicitly.
    begin
      execute 'revoke execute on function public.recompute_control_evidence(uuid) from anon, authenticated';
    exception when undefined_object then null; -- roles absent on a bare Postgres
    end;
    begin
      execute 'grant execute on function public.recompute_control_evidence(uuid) to service_role';
    exception when undefined_object then null; -- service_role absent on a bare Postgres
    end;
  end if;
end $$;
