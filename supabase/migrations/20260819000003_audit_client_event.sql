-- 20260819000003_audit_client_event.sql
--
-- Client-side audit writes were silently dropped: dashboard/src/lib/withAudit.ts
-- inserted into `audit_events`, a table no migration ever created, and the
-- canonical hash-chained appender (audit_log_append, ws03) is EXECUTE-granted
-- to service_role only. So every dashboard action audited via withAudit —
-- including HITL and approval decisions — produced no audit row at all.
--
-- Fix: a thin SECURITY DEFINER wrapper the authenticated role may call. The
-- org id and actor are forced server-side (current_user_org_id(), auth.uid())
-- so a client can never append into another tenant's chain or spoof an actor.
-- Rows land in the SAME hash-chained public.audit_log the Audit Trail reads.
-- Idempotent; safe to re-run.

CREATE OR REPLACE FUNCTION public.audit_client_event(
  p_action        text,
  p_resource_type text,
  p_resource_id   text DEFAULT NULL,
  p_outcome       text DEFAULT 'success',
  p_metadata      jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_catalog
AS $$
DECLARE
  v_org uuid;
BEGIN
  v_org := current_user_org_id();
  IF v_org IS NULL THEN
    RETURN NULL; -- no org context (e.g. unauthenticated) — nothing to record
  END IF;
  RETURN public.audit_log_append(
    p_org_id        => v_org,
    p_action        => p_action,
    p_resource_type => p_resource_type,
    p_actor_id      => auth.uid(),
    p_actor_type    => 'user',
    p_resource_id   => p_resource_id,
    p_outcome       => p_outcome,
    p_severity      => 'notice',
    p_metadata      => p_metadata
  );
EXCEPTION WHEN OTHERS THEN
  -- Era tolerance: on a replayed DB whose audit_log carries the legacy 006
  -- shape (no sequence_no/row_hash), the append cannot hash-chain. Surface
  -- nothing to the caller (audit stays best-effort) but never break the
  -- user-facing mutation that was being audited.
  RAISE WARNING 'audit_client_event skipped: %', SQLERRM;
  RETURN NULL;
END $$;

REVOKE ALL ON FUNCTION public.audit_client_event(text, text, text, text, jsonb) FROM public;
GRANT EXECUTE ON FUNCTION public.audit_client_event(text, text, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.audit_client_event(text, text, text, text, jsonb) TO service_role;
