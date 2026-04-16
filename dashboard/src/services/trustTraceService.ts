import { supabase, isSupabaseConfigured } from '../lib/supabase'
const TENANT_ID = 'TNT-001'
export async function fetchTrustTraces(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('trust_traces').select('*').eq('tenant_id', TENANT_ID).order('created_at', { ascending: false })
    if (error) { console.warn('[trustTraceService] fetch failed:', error.message); return [] }
    return data || []
  } catch (e) { return [] }
}
export async function upsertTrustTrace(record: any): Promise<any> {
  try {
    const { data, error } = await supabase.from('trust_traces').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) { console.warn('[trustTraceService] upsert failed:', error.message); return record }
    return data
  } catch (e) { return record }
}
export async function deleteTrustTrace(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('trust_traces').delete().eq('id', id)
    if (error) { console.warn('[trustTraceService] delete failed:', error.message); return false }
    return true
  } catch (e) { return false }
}

export const fetchTrustTraces = fetchAllTrustTraces
