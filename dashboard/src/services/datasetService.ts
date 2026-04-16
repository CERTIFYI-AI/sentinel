import { supabase, isSupabaseConfigured } from '../lib/supabase'
const TENANT_ID = 'TNT-001'
export async function fetchDatasets(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('datasets').select('*').eq('tenant_id', TENANT_ID).order('created_at', { ascending: false })
    if (error) { console.warn('[datasetService] fetch failed:', error.message); return [] }
    return data || []
  } catch { return [] }
}
export async function upsertDataset(record: any): Promise<any> {
  try {
    const { data, error } = await supabase.from('datasets').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) { console.warn('[datasetService] upsert failed:', error.message); return record }
    return data
  } catch { return record }
}
export async function deleteDataset(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('datasets').delete().eq('id', id)
    if (error) { console.warn('[datasetService] delete failed:', error.message); return false }
    return true
  } catch { return false }
}
