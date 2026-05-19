// @ts-nocheck
import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Use TrustTrace (PascalCase) - confirmed has data in Supabase
export async function fetchTrustTraces(): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('TrustTrace')
      .select('*')
      .order('createdAt', { ascending: false })
    if (error) { console.warn('[trustTraceService] fetch failed:', error.message); return [] }
    return data || []
  } catch (e) { return [] }
}

export async function upsertTrustTrace(record: any): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase
      .from('TrustTrace')
      .upsert(record)
      .select()
      .single()
    if (error) { console.warn('[trustTraceService] upsert failed:', error.message); return record }
    return data
  } catch (e) { return record }
}

export async function deleteTrustTrace(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('TrustTrace').delete().eq('id', id)
    if (error) { console.warn('[trustTraceService] delete failed:', error.message); return false }
    return true
  } catch (e) { return false }
}
