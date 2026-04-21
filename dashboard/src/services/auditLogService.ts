// @ts-nocheck
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export async function fetchAllAuditEntrys(limit = 200): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    // Use AuditLog (PascalCase Prisma table, has data)
    let q = supabase.from('AuditLog').select('*').order('timestamp', { ascending: false })
    if (limit) q = q.limit(limit)
    const { data, error } = await q
    if (error) {
      console.warn('[auditLogService] AuditLog fetch failed:', error.message)
      // Fallback to audit_log
      const { data: d2, error: e2 } = await supabase.from('audit_log').select('*').order('created_at', { ascending: false }).limit(limit)
      if (e2) { console.warn('[auditLogService] audit_log fallback failed:', e2.message); return [] }
      return d2 ?? []
    }
    return data ?? []
  } catch (e) { return [] }
}

export async function upsertAuditEntry(record: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase
      .from('AuditLog')
      .upsert({ ...record, timestamp: record.timestamp ?? new Date().toISOString() })
      .select()
      .single()
    if (error) { console.warn('[auditLogService] upsert failed:', error.message); return record }
    return data
  } catch (e) { return record }
}

export async function deleteAuditEntry(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('AuditLog').delete().eq('id', id)
    if (error) { console.warn('[auditLogService] delete failed:', error.message); return false }
    return true
  } catch (e) { return false }
}

// Backward-compatible aliases
export const fetchAuditEntrys = fetchAllAuditEntrys
export const saveAuditEntry = upsertAuditEntry
export function fetchAuditLogs(limit = 200) { return fetchAllAuditEntrys(limit) }
