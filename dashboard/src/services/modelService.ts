import { supabase, isSupabaseConfigured } from '../lib/supabase'

const TENANT_ID = 'default'

export async function fetchAllModels(): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('model_inventory')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
    if (error) { console.warn('[modelService] fetch failed:', error.message); return [] }
    return data ?? []
  } catch (e) { return [] }
}

export async function upsertModel(record: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase
      .from('model_inventory')
      .upsert({ ...record, tenant_id: TENANT_ID })
      .select()
      .single()
    if (error) { console.warn('[modelService] upsert failed:', error.message); return record }
    return data
  } catch (e) { return record }
}

export async function deleteModel(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase
      .from('model_inventory')
      .delete()
      .eq('id', id)
      .eq('tenant_id', TENANT_ID)
    if (error) { console.warn('[modelService] delete failed:', error.message); return false }
    return true
  } catch (e) { return false }
}

// Backward-compatible aliases
export const fetchModels = fetchAllModels
export const saveModel = upsertModel
