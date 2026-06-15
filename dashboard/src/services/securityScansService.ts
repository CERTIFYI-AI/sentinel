import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fromDB, mutateDB, getTenantId } from '@/lib/dataSource'

const TENANT_ID = getTenantId()

import { SEED_SECURITY_SCANS } from '../data/seedData'

export async function fetchAllSecurityScans(filters: Record<string,any> = {}) {
  if (!isSupabaseConfigured()) return SEED_SECURITY_SCANS
  try {
    let q = supabase.from('security_scans').select('*, run_by:user_profiles(id,full_name)').order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.type) q = q.eq('type', filters.type)
    const { data, error } = await q
    if (error) { console.warn('[securityScansService] fetch:', error.message); return SEED_SECURITY_SCANS }
    return data && data.length > 0 ? data : SEED_SECURITY_SCANS
  } catch { return SEED_SECURITY_SCANS }
}

export async function fetchSecurityScansById(id: string) {
  if (!isSupabaseConfigured() || !id) return null
  try {
    const { data, error } = await supabase.from('security_scans').select('*').eq('id', id).single()
    if (error) return null
    return data
  } catch { return null }
}

export async function upsertSecurityScans(record: any) {
  if (!isSupabaseConfigured()) return record
  try {
    const { data, error } = await supabase.from('security_scans').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) throw error
    return data
  } catch (e) { console.warn('[securityScansService] upsert:', e); return record }
}

export async function deleteSecurityScans(id: string) {
  if (!isSupabaseConfigured()) return true
  try {
    const { error } = await supabase.from('security_scans').delete().eq('id', id)
    if (error) throw error
    return true
  } catch { return false }
}
