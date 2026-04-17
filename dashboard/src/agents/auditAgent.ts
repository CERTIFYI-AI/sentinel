// @ts-nocheck
import { supabase } from '../lib/supabaseClient';
import { sha256 } from '../lib/evidenceChain';

export interface AuditEntry {
  orgId: string;
  actorId: string | null;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata?: Record<string, unknown>;
}

export async function logAudit(entry: AuditEntry): Promise<void> {
  try {
    const metaStr = JSON.stringify(entry.metadata ?? {});
    const hash = await sha256([entry.action, entry.entityType, entry.entityId ?? '', metaStr, new Date().toISOString()].join('|'));
    const { error } = await supabase.from('audit_log').insert({
      org_id: entry.orgId,
      actor_id: entry.actorId,
      action: entry.action,
      entity_type: entry.entityType,
      entity_id: entry.entityId,
      metadata: entry.metadata ?? {},
      sha256: hash,
    });
    if (error) {
      console.warn('Audit log write failed (non-blocking):', error.message);
    }
  } catch (e) {
    console.warn('Audit agent error (non-blocking):', e);
  }
}

export async function getAuditLog(
  orgId: string,
  options?: { entityType?: string; limit?: number }
): Promise<Array<Record<string, unknown>>> {
  try {
    let query = supabase.from('audit_log').select('*').eq('org_id', orgId).order('created_at', { ascending: false });
    if (options?.entityType) query = query.eq('entity_type', options.entityType);
    if (options?.limit) query = query.limit(options.limit);
    const { data, error } = await query;
    if (error) throw error;
    return data ?? [];
  } catch {
    return [];
  }
}
