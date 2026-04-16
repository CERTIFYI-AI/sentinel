import { supabase, isSupabaseConfigured } from '../lib/supabase'
const TENANT_ID = 'TNT-001'
export async function fetchIncidents(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('incidents').select('*').eq('tenant_id', TENANT_ID).order('created_at', { ascending: false })
    if (error) { console.warn('[incidentService] fetch failed:', error.message); return [] }
    return data || []
  } catch { return [] }
}
export async function upsertIncident(record: any): Promise<any> {
  try {
    const { data, error } = await supabase.from('incidents').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) { console.warn('[incidentService] upsert failed:', error.message); return record }
    return data
  } catch { return record }
}
export async function deleteIncident(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('incidents').delete().eq('id', id)
    if (error) { console.warn('[incidentService] delete failed:', error.message); return false }
    return true
  } catch { return false }
}
