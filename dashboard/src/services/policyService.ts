import { supabase, isSupabaseConfigured } from '../lib/supabase'
const TENANT_ID = 'TNT-001'
export async function fetchPolicys(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('policies').select('*').eq('tenant_id', TENANT_ID).order('created_at', { ascending: false })
    if (error) { console.warn('[policyService] fetch failed:', error.message); return [] }
    return data || []
  } catch { return [] }
}
export async function upsertPolicy(record: any): Promise<any> {
  try {
    const { data, error } = await supabase.from('policies').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) { console.warn('[policyService] upsert failed:', error.message); return record }
    return data
  } catch { return record }
}
export async function deletePolicy(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('policies').delete().eq('id', id)
    if (error) { console.warn('[policyService] delete failed:', error.message); return false }
    return true
  } catch { return false }
}
