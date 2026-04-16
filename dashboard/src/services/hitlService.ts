import { supabase, isSupabaseConfigured } from '../lib/supabase'
const TENANT_ID = 'TNT-001'
export async function fetchHitlItems(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('hitl_items').select('*').eq('tenant_id', TENANT_ID).order('created_at', { ascending: false })
    if (error) { console.warn('[hitlService] fetch failed:', error.message); return [] }
    return data || []
  } catch { return [] }
}
export async function upsertHitlItem(record: any): Promise<any> {
  try {
    const { data, error } = await supabase.from('hitl_items').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) { console.warn('[hitlService] upsert failed:', error.message); return record }
    return data
  } catch { return record }
}
export async function deleteHitlItem(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('hitl_items').delete().eq('id', id)
    if (error) { console.warn('[hitlService] delete failed:', error.message); return false }
    return true
  } catch { return false }
}
