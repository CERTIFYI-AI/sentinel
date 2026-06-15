import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fromDB, mutateDB, getTenantId } from '@/lib/dataSource'

const TENANT_ID = getTenantId()

import { SEED_REMEDIATION_ITEMS } from '../data/seedData'

export async function fetchAllRemediation(filters: Record<string,any> = {}) {
  if (!isSupabaseConfigured()) return SEED_REMEDIATION_ITEMS
  try {
    let q = supabase.from('remediation_plans').select('*').order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.type) q = q.eq('type', filters.type)
    const { data, error } = await q
    if (error) { console.warn('[remediationService] fetch:', error.message); return SEED_REMEDIATION_ITEMS }
    return data && data.length > 0 ? data : SEED_REMEDIATION_ITEMS
  } catch { return SEED_REMEDIATION_ITEMS }
}

export async function fetchRemediationById(id: string) {
  if (!isSupabaseConfigured() || !id) return null
  try {
    const { data, error } = await supabase.from('remediation_plans').select('*').eq('id', id).single()
    if (error) return null
    return data
  } catch { return null }
}

export async function upsertRemediation(record: any) {
  if (!isSupabaseConfigured()) return record
  try {
    const { data, error } = await supabase.from('remediation_plans').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) throw error
    return data
  } catch (e) { console.warn('[remediationService] upsert:', e); return record }
}

export async function deleteRemediation(id: string) {
  if (!isSupabaseConfigured()) return true
  try {
    const { error } = await supabase.from('remediation_plans').delete().eq('id', id)
    if (error) throw error
    return true
  } catch { return false }
}
