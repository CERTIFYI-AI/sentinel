import { supabase, isSupabaseConfigured } from '../lib/supabase'

const TENANT_ID = 'default'

export async function fetchAllPolicys(): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('policies')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
    if (error) {
      if (error.message.includes('tenant_id')) {
        const { data: d2 } = await supabase.from('policies').select('*').order('created_at', { ascending: false })
        return d2 ?? []
      }
      console.warn('[policyService] fetch failed:', error.message); return []
    }
    return data ?? []
  } catch (e) { return [] }
}

export async function upsertPolicy(record: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase
      .from('policies')
      .upsert({ ...record, tenant_id: TENANT_ID })
      .select()
      .single()
    if (error) {
      if (error.message.includes('tenant_id')) {
        const { data: d2 } = await supabase.from('policies').upsert(record).select().single()
        return d2 ?? record
      }
      console.warn('[policyService] upsert failed:', error.message); return record
    }
    return data
  } catch (e) { return record }
}

export async function deletePolicy(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase
      .from('policies')
      .delete()
      .eq('id', id)
    if (error) { console.warn('[policyService] delete failed:', error.message); return false }
    return true
  } catch (e) { return false }
}

// Backward-compatible aliases
export const fetchPolicys = fetchAllPolicys
export const savePolicy = upsertPolicy
