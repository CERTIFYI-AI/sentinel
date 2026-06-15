import { supabase, isSupabaseConfigured } from '../lib/supabase'

import { EVIDENCE } from '../data/seed'

const TENANT_ID = 'default'

export async function fetchAllEvidences(): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return EVIDENCE
  try {
    const { data, error } = await supabase
      .from('evidence')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
    if (error) { console.warn('[evidenceService] fetch failed:', error.message); return EVIDENCE }
    return data && data.length > 0 ? data : EVIDENCE
  } catch (e) { return EVIDENCE }
}

export async function upsertEvidence(record: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase
      .from('evidence')
      .upsert({ ...record, tenant_id: TENANT_ID })
      .select()
      .single()
    if (error) { console.warn('[evidenceService] upsert failed:', error.message); return record }
    return data
  } catch (e) { return record }
}

export async function deleteEvidence(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase
      .from('evidence')
      .delete()
      .eq('id', id)
      .eq('tenant_id', TENANT_ID)
    if (error) { console.warn('[evidenceService] delete failed:', error.message); return false }
    return true
  } catch (e) { return false }
}

// Backward-compatible aliases
export const fetchEvidences = fetchAllEvidences
export const saveEvidence = upsertEvidence
