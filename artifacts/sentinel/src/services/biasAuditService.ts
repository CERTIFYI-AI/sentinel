import { supabase, isSupabaseConfigured } from '../lib/supabase'

const TENANT_ID = 'default'

export async function fetchAllBiasAudits(): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('bias_audits')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
    if (error) { console.warn('[biasAuditService] fetch failed:', error.message); return [] }
    return data ?? []
  } catch (e) { return [] }
}

export async function upsertBiasAudit(record: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase
      .from('bias_audits')
      .upsert({ ...record, tenant_id: TENANT_ID })
      .select()
      .single()
    if (error) { console.warn('[biasAuditService] upsert failed:', error.message); return record }
    return data
  } catch (e) { return record }
}

export async function deleteBiasAudit(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase
      .from('bias_audits')
      .delete()
      .eq('id', id)
      .eq('tenant_id', TENANT_ID)
    if (error) { console.warn('[biasAuditService] delete failed:', error.message); return false }
    return true
  } catch (e) { return false }
}

// Backward-compatible aliases
export const fetchBiasAudits = fetchAllBiasAudits
export const saveBiasAudit = upsertBiasAudit
