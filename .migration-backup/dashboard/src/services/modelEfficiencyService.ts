// @ts-nocheck
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type ModelEfficiencyRecord = {
  id: string
  org_id?: string
  model_name: string
  version?: string
  task?: string
  latency_p50?: number
  latency_p99?: number
  throughput?: number
  accuracy?: number
  f1_score?: number
  cost_per_inference?: number
  memory_mb?: number
  carbon_per_inference?: number
  compliance_score?: number
  bias_score?: number
  explainability_score?: number
  overall_score?: number
  benchmarked_by?: string
  metadata?: Record<string,any>
  benchmarked_at?: string
  created_at: string
  updated_at: string
}

export async function fetchAllModelEfficiency(filters: Record<string,any> = {}): Promise<ModelEfficiencyRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    let q = supabase.from('model_efficiency').select('*').order('created_at', { ascending: false })
    const { data, error } = await q
    if (error) { console.warn('[modelEfficiencyService] fetch:', error.message); return [] }
    return (data ?? []) as ModelEfficiencyRecord[]
  } catch { return [] }
}

export async function upsertModelEfficiency(record: Partial<ModelEfficiencyRecord>): Promise<ModelEfficiencyRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.from('model_efficiency').upsert(record).select().single()
    if (error) { console.warn('[modelEfficiencyService] upsert:', error.message); return null }
    return data as ModelEfficiencyRecord
  } catch { return null }
}

export async function deleteModelEfficiency(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('model_efficiency').delete().eq('id', id)
    if (error) { console.warn('[modelEfficiencyService] delete:', error.message); return false }
    return true
  } catch { return false }
}

export const fetchModelEfficiency = fetchAllModelEfficiency
