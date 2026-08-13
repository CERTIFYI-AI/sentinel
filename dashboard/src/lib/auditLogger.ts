import { supabase } from './supabase';
import logger from './logger';

/**
 * Fire-and-forget audit trail writer (~87 call sites treat it as such — it
 * must never throw), targeting the flat `audit_log` table from
 * supabase/migrations/006_core.sql:
 *   org_id, actor_id, actor_name, actor_role, module, entity_type,
 *   entity_id (uuid), entity_name, action, old_values, new_values, created_at
 *
 * Failures were previously invisible: supabase-js `insert` does not throw —
 * it resolves with `{ error }` — so the old try/catch never fired and the
 * audit trail could be silently down. Now every failed write is logged via
 * logger.warn (which always emits, even in production) and flips
 * `auditWriteHealthy` so ops/UI can detect a dead trail.
 */

/** False once any audit write has failed (trail may be incomplete). */
export let auditWriteHealthy = true;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

let warnedOnce = false;
function reportFailure(err: unknown) {
  auditWriteHealthy = false;
  logger.warn('[audit] write failed', err);
  if (!warnedOnce) {
    warnedOnce = true;
    console.warn('[audit] Audit trail writes are FAILING — the audit log is incomplete until this is resolved.');
  }
}

export async function logAction(params: {
  module: string;
  entityType: string;
  entityId?: string;
  entityName?: string;
  action: string;
  oldValues?: unknown;
  newValues?: unknown;
}) {
  if (!supabase) return;
  try {
    const { data: { user } } = await supabase.auth.getUser();
    // audit_log.entity_id is uuid-typed; callers sometimes pass business
    // codes/slugs. Keep non-uuid identifiers in entity_name instead of
    // failing the whole insert on a type error.
    const entityId = params.entityId && UUID_RE.test(params.entityId) ? params.entityId : null;
    const entityName =
      params.entityName ??
      (params.entityId && !entityId ? params.entityId : null);
    const { error } = await supabase.from('audit_log').insert({
      actor_id: user?.id ?? null,
      actor_name: user?.user_metadata?.full_name ?? user?.email ?? 'System',
      module: params.module,
      entity_type: params.entityType,
      entity_id: entityId,
      entity_name: entityName,
      action: params.action,
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
    });
    if (error) reportFailure(error);
  } catch (e) {
    reportFailure(e);
  }
}
