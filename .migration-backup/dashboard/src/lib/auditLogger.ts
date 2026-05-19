import { supabase } from './supabase';

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
    await supabase.from('audit_log').insert({
      actor_id: user?.id ?? null,
      actor_name: user?.user_metadata?.full_name ?? 'System',
      module: params.module,
      entity_type: params.entityType,
      entity_id: params.entityId ?? null,
      entity_name: params.entityName ?? null,
      action: params.action,
      old_values: params.oldValues ?? null,
      new_values: params.newValues ?? null,
    });
  } catch (e) {
    console.warn('[Sentinel] Audit log error:', e);
  }
}
