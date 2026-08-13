-- CRITICAL FIX: infinite recursion in RLS org resolution.
--
-- The `user_profiles` policy `user_profiles_tenant_isolation` has qual
-- `org_id = get_org_id()`. `get_org_id()` was NOT security definer, so it read
-- `user_profiles` under RLS, which re-entered the same policy → `get_org_id()`
-- again → "stack depth limit exceeded". This blocked EVERY authenticated read of
-- any org-scoped table (Model Registry showed 0 models, etc.) because those
-- policies transitively evaluate the recursive path.
--
-- Fix: make get_org_id SECURITY DEFINER (matching current_user_org_id /
-- get_user_org_id) so its user_profiles read bypasses RLS and the cycle breaks.
-- Also qualify user_profiles in get_user_org_id (it had search_path='' with an
-- UNqualified table name, which errored "relation does not exist" once the
-- recursion was removed). Applied via Supabase MCP on 2026-08-13.

CREATE OR REPLACE FUNCTION public.get_org_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT COALESCE(
    NULLIF(current_setting('request.jwt.claim.org_id', true), '')::uuid,
    (SELECT org_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1)
  );
$function$;

CREATE OR REPLACE FUNCTION public.get_user_org_id()
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT org_id FROM public.user_profiles WHERE id = auth.uid() LIMIT 1;
$function$;
