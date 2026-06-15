import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fromDB, mutateDB, getTenantId } from '@/lib/dataSource'

const TENANT_ID = getTenantId()

import { SEED_BCP_PLANS } from '../data/seedData'

export async function fetchAllBcpPlans(filters: Record<string,any> = {}) {
  if (!isSupabaseConfigured()) return SEED_BCP_PLANS
  try {
    let q = supabase.from('bcp_plans').select('*').order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.type) q = q.eq('type', filters.type)
    const { data, error } = await q
    if (error) { console.warn('[bcpPlansService] fetch:', error.message); return SEED_BCP_PLANS }
    return data && data.length > 0 ? data : SEED_BCP_PLANS
  } catch { return SEED_BCP_PLANS }
}

export async function fetchBcpPlansById(id: string) {
  if (!isSupabaseConfigured() || !id) return null
  try {
    const { data, error } = await supabase.from('bcp_plans').select('*').eq('id', id).single()
    if (error) return null
    return data
  } catch { return null }
}

export async function upsertBcpPlans(record: any) {
  if (!isSupabaseConfigured()) return record
  try {
    const { data, error } = await supabase.from('bcp_plans').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) throw error
    return data
  } catch (e) { console.warn('[bcpPlansService] upsert:', e); return record }
}

export async function deleteBcpPlans(id: string) {
  if (!isSupabaseConfigured()) return true
  try {
    const { error } = await supabase.from('bcp_plans').delete().eq('id', id)
    if (error) throw error
    return true
  } catch { return false }
}
