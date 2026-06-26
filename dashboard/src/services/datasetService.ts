import { supabase, isSupabaseConfigured } from '../lib/supabase'

export async function fetchAllDatasets(filters: Record<string, any> = {}): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    // Try PascalCase Prisma table first (has data)
    const { data, error } = await supabase
      .from('Dataset')
      .select('*')
      .order('createdAt', { ascending: false })
    if (!error && data && data.length > 0) return data
    // Fallback to snake_case
    const { data: d2, error: e2 } = await supabase
      .from('datasets')
      .select('*')
      .order('created_at', { ascending: false })
    if (e2) { console.warn('[datasetService] fetch:', e2.message); return [] }
    return d2 ?? []
  } catch (e) { return [] }
}

export async function upsertDataset(record: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase
      .from('Dataset')
      .upsert(record)
      .select()
      .single()
    if (error) {
      console.warn('[datasetService] upsert (Dataset):', error.message)
      // try snake_case fallback
      const { data: d2, error: e2 } = await supabase.from('datasets').upsert(record).select().single()
      if (e2) { console.warn('[datasetService] upsert fallback:', e2.message); return record }
      return d2 ?? record
    }
    return data
  } catch (e) { return record }
}

export async function deleteDataset(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('Dataset').delete().eq('id', id)
    if (error) {
      const { error: e2 } = await supabase.from('datasets').delete().eq('id', id)
      if (e2) { console.warn('[datasetService] delete:', e2.message); return false }
    }
    return true
  } catch (e) { return false }
}

// Backward-compatible aliases
export const fetchDatasets = fetchAllDatasets
export const saveDataset = upsertDataset
