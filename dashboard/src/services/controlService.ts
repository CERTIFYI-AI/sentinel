import { supabase, isSupabaseConfigured } from '../lib/supabase'
const TENANT_ID = 'TNT-001'
export async function fetchControls(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('controls').select('*').eq('tenant_id', TENANT_ID).order('created_at', { ascending: false })
    if (error) { console.warn('[controlService] fetch failed:', error.message); return [] }
    return data || []
  } catch { return [] }
}
export async function upsertControl(record: any): Promise<any> {
  try {
    const { data, error } = await supabase.from('controls').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) { console.warn('[controlService] upsert failed:', error.message); return record }
    return data
  } catch { return record }
}
export async function deleteControl(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('controls').delete().eq('id', id)
    if (error) { console.warn('[controlService] delete failed:', error.message); return false }
    return true
  } catch { return false }
}
