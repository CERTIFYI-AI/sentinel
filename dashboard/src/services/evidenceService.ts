import { supabase, isSupabaseConfigured } from '../lib/supabase'
const TENANT_ID = 'TNT-001'
export async function fetchEvidences(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('evidence').select('*').eq('tenant_id', TENANT_ID).order('created_at', { ascending: false })
    if (error) { console.warn('[evidenceService] fetch failed:', error.message); return [] }
    return data || []
  } catch { return [] }
}
export async function upsertEvidence(record: any): Promise<any> {
  try {
    const { data, error } = await supabase.from('evidence').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) { console.warn('[evidenceService] upsert failed:', error.message); return record }
    return data
  } catch { return record }
}
export async function deleteEvidence(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('evidence').delete().eq('id', id)
    if (error) { console.warn('[evidenceService] delete failed:', error.message); return false }
    return true
  } catch { return false }
}
