import { supabase, isSupabaseConfigured } from '../lib/supabase'
const TENANT_ID = 'TNT-001'
export async function fetchRegulations(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('regulations').select('*').eq('tenant_id', TENANT_ID).order('created_at', { ascending: false })
    if (error) { console.warn('[regulationService] fetch failed:', error.message); return [] }
    return data || []
  } catch { return [] }
}
export async function upsertRegulation(record: any): Promise<any> {
  try {
    const { data, error } = await supabase.from('regulations').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) { console.warn('[regulationService] upsert failed:', error.message); return record }
    return data
  } catch { return record }
}
export async function deleteRegulation(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('regulations').delete().eq('id', id)
    if (error) { console.warn('[regulationService] delete failed:', error.message); return false }
    return true
  } catch { return false }
}
