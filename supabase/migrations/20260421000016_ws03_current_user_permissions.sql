-- SPDX-License-Identifier: Apache-2.0
-- Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
--
-- WS0.3 — RBAC surface complement.
--
-- Adds the single RPC the dashboard calls at session boot to populate
-- the `usePermissions()` cache. The function runs under the caller's
-- JWT; it cannot be used to enumerate permissions for any other user.
--
-- Idempotent. Re-runnable.

BEGIN;

CREATE OR REPLACE FUNCTION public.current_user_permissions()
RETURNS TABLE (grants text[], roles text[])
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, auth, pg_catalog
AS $$
DECLARE
  uid uuid := auth.uid();
  oid uuid := auth.current_org_id();
BEGIN
  IF uid IS NULL OR oid IS NULL THEN
    -- Unauthenticated or no tenant claim: return an empty set.
    grants := ARRAY[]::text[];
    roles  := ARRAY[]::text[];
    RETURN NEXT;
    RETURN;
  END IF;

  -- Active roles = directly-bound + currently-approved JIT elevations.
  WITH active_roles AS (
    SELECT urb.role::text AS role
      FROM public.user_role_bindings urb
     WHERE urb.user_id = uid
       AND urb.org_id  = oid
       AND urb.deleted_at IS NULL
    UNION
    SELECT jit.elevated_role::text
      FROM public.jit_elevations jit
     WHERE jit.user_id = uid
       AND jit.org_id  = oid
       AND jit.approved_at IS NOT NULL
       AND jit.expires_at > now()
       AND jit.revoked_at IS NULL
  )
  SELECT
    COALESCE(array_agg(DISTINCT rp.permission), ARRAY[]::text[]),
    COALESCE(array_agg(DISTINCT ar.role),       ARRAY[]::text[])
    INTO grants, roles
    FROM active_roles ar
    LEFT JOIN public.rbac_permissions rp ON rp.role::text = ar.role;

  RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.current_user_permissions() IS
  'Returns (grants, roles) for the calling user scoped to their current org. Used by dashboard usePermissions().';

GRANT EXECUTE ON FUNCTION public.current_user_permissions() TO authenticated;

COMMIT;
