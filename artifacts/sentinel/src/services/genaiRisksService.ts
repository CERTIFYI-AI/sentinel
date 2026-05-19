// @ts-nocheck
// Auto-generated service for `genai_risks` — AI Governance module.
// Pattern mirrors aiImpactService / modelEfficiencyService.
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

const TABLE = 'genai_risks'

export async function fetchAllGenAIRisks(filters: Record<string, any> = {}): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    let q = supabase.from(TABLE).select('*').order('created_at', { ascending: false })
    for (const [k, v] of Object.entries(filters)) {
      if (v === undefined || v === null || v === '' || v === 'all') continue
      q = q.eq(k, v)
    }
    const { data, error } = await q
    if (error) { console.warn('[genai_risks] fetch:', error.message); return [] }
    return data ?? []
  } catch (e) { console.warn('[genai_risks] fetch ex:', e); return [] }
}

export async function fetchGenAIRiskById(id: string): Promise<any | null> {
  if (!isSupabaseConfigured() || !supabase || !id) return null
  try {
    const { data, error } = await supabase.from(TABLE).select('*').eq('id', id).single()
    if (error) return null
    return data
  } catch { return null }
}

export async function upsertGenAIRisk(record: any): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase.from(TABLE).upsert(record).select().single()
    if (error) { console.warn('[genai_risks] upsert:', error.message); return record }
    return data
  } catch (e) { console.warn('[genai_risks] upsert ex:', e); return record }
}

export async function deleteGenAIRisk(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) { console.warn('[genai_risks] delete:', error.message); return false }
    return true
  } catch { return false }
}
