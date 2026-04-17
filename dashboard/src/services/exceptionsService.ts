import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fromDB, mutateDB, getTenantId } from '@/lib/dataSource'

const TENANT_ID = getTenantId()

export async function fetchAllExceptions(filters: Record<string,any> = {}) {
  if (!isSupabaseConfigured()) return []
  try {
    let q = supabase.from('exceptions').select('*').order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.type) q = q.eq('type', filters.type)
    const { data, error } = await q
    if (error) { console.warn('[exceptionsService] fetch:', error.message); return [] }
    return data ?? []
  } catch { return [] }
}

export async function fetchExceptionsById(id: string) {
  if (!isSupabaseConfigured() || !id) return null
  try {
    const { data, error } = await supabase.from('exceptions').select('*').eq('id', id).single()
    if (error) return null
    return data
  } catch { return null }
}

export async function upsertExceptions(record: any) {
  if (!isSupabaseConfigured()) return record
  try {
    const { data, error } = await supabase.from('exceptions').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) throw error
    return data
  } catch (e) { console.warn('[exceptionsService] upsert:', e); return record }
}

export async function deleteExceptions(id: string) {
  if (!isSupabaseConfigured()) return true
  try {
    const { error } = await supabase.from('exceptions').delete().eq('id', id)
    if (error) throw error
    return true
  } catch { return false }
}
