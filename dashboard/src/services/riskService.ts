import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const TENANT_ID = 'TNT-001'

export async function fetchRisks(): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('risks')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
    if (error) { console.warn('[riskService] fetch failed:', error.message); return [] }
    return data || []
  } catch { return [] }
}

export async function upsertRisk(risk: any): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const record = { ...risk, tenant_id: TENANT_ID, updated_at: new Date().toISOString() }
    if (!record.id) record.id = crypto.randomUUID()
    if (!record.created_at) record.created_at = new Date().toISOString()
    const { data, error } = await supabase.from('risks').upsert(record).select().single()
    if (error) { console.warn('[riskService] upsert failed:', error.message); return null }
    return data
  } catch { return null }
}

export async function deleteRisk(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('risks').delete().eq('id', id).eq('tenant_id', TENANT_ID)
    if (error) { console.warn('[riskService] delete failed:', error.message); return false }
    return true
  } catch { return false }
}
