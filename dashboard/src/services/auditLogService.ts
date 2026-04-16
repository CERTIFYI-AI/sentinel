import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const TENANT_ID = 'TNT-001'

export interface AuditLogRecord {
  id: string
  entityType: string
  entityId: string
  action: string
  userId: string
  details: Record<string, any>
  timestamp: string
  tenantId: string
}

export async function fetchAuditLogs(limit = 100): Promise<AuditLogRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('AuditLog')
      .select('*')
      .eq('tenantId', TENANT_ID)
      .order('timestamp', { ascending: false })
      .limit(limit)
    if (error) { console.warn('[auditLogService] fetch failed:', error.message); return [] }
    return (data || []) as AuditLogRecord[]
  } catch { return [] }
}

export async function logAuditEvent(entry: Omit<AuditLogRecord, 'id' | 'tenantId' | 'timestamp'>): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) return
  try {
    await supabase.from('AuditLog').insert({
      id: crypto.randomUUID(),
      tenantId: TENANT_ID,
      timestamp: new Date().toISOString(),
      ...entry,
    })
  } catch { /* non-critical */ }
}
