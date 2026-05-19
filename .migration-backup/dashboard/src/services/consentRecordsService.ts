import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fromDB, mutateDB, getTenantId } from '@/lib/dataSource'

const TENANT_ID = getTenantId()

export async function fetchAllConsentRecords(filters: Record<string,any> = {}) {
  if (!isSupabaseConfigured()) return []
  try {
    let q = supabase.from('consent_records').select('*').order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.type) q = q.eq('type', filters.type)
    const { data, error } = await q
    if (error) { console.warn('[consentRecordsService] fetch:', error.message); return [] }
    return data ?? []
  } catch { return [] }
}

export async function fetchConsentRecordsById(id: string) {
  if (!isSupabaseConfigured() || !id) return null
  try {
    const { data, error } = await supabase.from('consent_records').select('*').eq('id', id).single()
    if (error) return null
    return data
  } catch { return null }
}

export async function upsertConsentRecords(record: any) {
  if (!isSupabaseConfigured()) return record
  try {
    const { data, error } = await supabase.from('consent_records').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) throw error
    return data
  } catch (e) { console.warn('[consentRecordsService] upsert:', e); return record }
}

export async function deleteConsentRecords(id: string) {
  if (!isSupabaseConfigured()) return true
  try {
    const { error } = await supabase.from('consent_records').delete().eq('id', id)
    if (error) throw error
    return true
  } catch { return false }
}
