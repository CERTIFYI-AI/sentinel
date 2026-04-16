import { supabase, isSupabaseConfigured } from '../lib/supabase'
const TENANT_ID = 'TNT-001'
export async function fetchAgents(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('agents').select('*').eq('tenant_id', TENANT_ID).order('created_at', { ascending: false })
    if (error) { console.warn('[agentService] fetch failed:', error.message); return [] }
    return data || []
  } catch { return [] }
}
export async function upsertAgent(record: any): Promise<any> {
  try {
    const { data, error } = await supabase.from('agents').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) { console.warn('[agentService] upsert failed:', error.message); return record }
    return data
  } catch { return record }
}
export async function deleteAgent(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('agents').delete().eq('id', id)
    if (error) { console.warn('[agentService] delete failed:', error.message); return false }
    return true
  } catch { return false }
}
