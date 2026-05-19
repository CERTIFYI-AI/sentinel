import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fromDB, mutateDB, getTenantId } from '@/lib/dataSource'

const TENANT_ID = getTenantId()

export async function fetchAllConformity(filters: Record<string,any> = {}) {
  if (!isSupabaseConfigured()) return []
  try {
    let q = supabase.from('conformity_assessments').select('*').order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.type) q = q.eq('type', filters.type)
    const { data, error } = await q
    if (error) { console.warn('[conformityService] fetch:', error.message); return [] }
    return data ?? []
  } catch { return [] }
}

export async function fetchConformityById(id: string) {
  if (!isSupabaseConfigured() || !id) return null
  try {
    const { data, error } = await supabase.from('conformity_assessments').select('*').eq('id', id).single()
    if (error) return null
    return data
  } catch { return null }
}

export async function upsertConformity(record: any) {
  if (!isSupabaseConfigured()) return record
  try {
    const { data, error } = await supabase.from('conformity_assessments').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) throw error
    return data
  } catch (e) { console.warn('[conformityService] upsert:', e); return record }
}

export async function deleteConformity(id: string) {
  if (!isSupabaseConfigured()) return true
  try {
    const { error } = await supabase.from('conformity_assessments').delete().eq('id', id)
    if (error) throw error
    return true
  } catch { return false }
}
