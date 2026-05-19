import { supabase, isSupabaseConfigured } from '../lib/supabase'
const TENANT_ID = 'TNT-001'
export async function fetchComplianceEvents(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('compliance_events').select('*').eq('tenant_id', TENANT_ID).order('created_at', { ascending: false })
    if (error) { console.warn('[complianceEventService] fetch failed:', error.message); return [] }
    return data || []
  } catch (e) { return [] }
}
export async function upsertComplianceEvent(record: any): Promise<any> {
  try {
    const { data, error } = await supabase.from('compliance_events').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) { console.warn('[complianceEventService] upsert failed:', error.message); return record }
    return data
  } catch (e) { return record }
}
export async function deleteComplianceEvent(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('compliance_events').delete().eq('id', id)
    if (error) { console.warn('[complianceEventService] delete failed:', error.message); return false }
    return true
  } catch (e) { return false }
}
