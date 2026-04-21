// Licensed to CERTIFYI-AI under the Apache License, Version 2.0.
// Wraps mutations to write to audit_events table after success.
import { supabase } from './supabase'

export async function withAudit<T>(
  orgId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  fn: () => Promise<T>
): Promise<T> {
  const result = await fn()
  // Best-effort audit write — never throws; void suppresses unhandled-promise lint
  void supabase.from('audit_events').insert({
    org_id: orgId,
    action,
    resource_type: resourceType,
    resource_id: resourceId,
    actor_id: (await supabase.auth.getUser()).data.user?.id,
    created_at: new Date().toISOString(),
  }).then(() => undefined, (e: unknown) => console.warn('[withAudit]', e))
  return result
}
