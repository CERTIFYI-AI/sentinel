// @ts-nocheck
// Auto-generated service for `fallback_logs` — AI Governance module.
// Pattern mirrors aiImpactService / modelEfficiencyService.
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const TABLE = 'fallback_logs'

export async function fetchAllFallbackLogs(filters: Record<string, any> = {}): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    let q = supabase.from(TABLE).select('*').order('occurred_at', { ascending: false })
    for (const [k, v] of Object.entries(filters)) {
      if (v === undefined || v === null || v === '' || v === 'all') continue
      q = q.eq(k, v)
    }
    const { data, error } = await q
    if (error) { console.warn('[fallback_logs] fetch:', error.message); return [] }
    return data ?? []
  } catch (e) { console.warn('[fallback_logs] fetch ex:', e); return [] }
}

export async function fetchFallbackLogById(id: string): Promise<any | null> {
  if (!isSupabaseConfigured() || !supabase || !id) return null
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
    if (error) return null
    return data
  } catch { return null }
}

export async function upsertFallbackLog(record: any): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase.from(TABLE).upsert(record).select().single()
    if (error) { console.warn('[fallback_logs] upsert:', error.message); return record }
    return data
  } catch (e) { console.warn('[fallback_logs] upsert ex:', e); return record }
}

export async function deleteFallbackLog(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) { console.warn('[fallback_logs] delete:', error.message); return false }
    return true
  } catch { return false }
}
