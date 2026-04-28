// @ts-nocheck
// Auto-generated service for `model_performance_metrics` — AI Governance module.
// Pattern mirrors aiImpactService / modelEfficiencyService.
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const TABLE = 'model_performance_metrics'

export async function fetchAllModelPerformances(filters: Record<string, any> = {}): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    let q = supabase.from(TABLE).select('*').order('recorded_at', { ascending: false })
    for (const [k, v] of Object.entries(filters)) {
      if (v === undefined || v === null || v === '' || v === 'all') continue
      q = q.eq(k, v)
    }
    const { data, error } = await q
    if (error) { console.warn('[model_performance_metrics] fetch:', error.message); return [] }
    return data ?? []
  } catch (e) { console.warn('[model_performance_metrics] fetch ex:', e); return [] }
}

export async function fetchModelPerformanceById(id: string): Promise<any | null> {
  if (!isSupabaseConfigured() || !supabase || !id) return null
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
    if (error) return null
    return data
  } catch { return null }
}

export async function upsertModelPerformance(record: any): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase.from(TABLE).upsert(record).select().single()
    if (error) { console.warn('[model_performance_metrics] upsert:', error.message); return record }
    return data
  } catch (e) { console.warn('[model_performance_metrics] upsert ex:', e); return record }
}

export async function deleteModelPerformance(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) { console.warn('[model_performance_metrics] delete:', error.message); return false }
    return true
  } catch { return false }
}
