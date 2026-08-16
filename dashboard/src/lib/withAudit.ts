// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// Wraps client-side mutations to append to the hash-chained audit_log after
// success, via the audit_client_event RPC (SECURITY DEFINER — org and actor
// are resolved server-side, so a client can never write into another
// tenant's chain or spoof an actor).
//
// The previous implementation inserted into `audit_events`, a table no
// migration ever created, so every client-side audit write was silently
// dropped. Best-effort semantics are kept: the audited mutation never fails
// because the audit write failed, but failures are surfaced to the console.
import { supabase } from './supabase'

export async function withAudit<T>(
  orgId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  fn: () => Promise<T>,
  /** Human-readable name of the audited entity (e.g. the review/approval
   *  title). Forwarded in p_metadata as entity_name so the Audit Trail can
   *  render a real label instead of a raw uuid. */
  entityName?: string
): Promise<T> {
  const result = await fn()
  // orgId is accepted for signature compatibility but the server derives the
  // real org from the session — a mismatched value cannot cross tenants.
  void supabase
    .rpc('audit_client_event', {
      p_action: action,
      p_resource_type: resourceType,
      p_resource_id: resourceId,
      p_outcome: 'success',
      p_metadata: { client_org_hint: orgId, ...(entityName ? { entity_name: entityName } : {}) },
    })
    .then(
      ({ data, error }: { data: unknown; error: { message: string } | null }) => {
        if (error) console.warn('[withAudit] audit append failed: %s', error.message)
        else if (data == null) console.warn('[withAudit] audit append skipped (no org context)')
      },
      (e: unknown) => console.warn('[withAudit] %s', e instanceof Error ? e.message : String(e))
    )
  return result
}
