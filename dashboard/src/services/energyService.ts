import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type EnergyMetric = {
  id: string
  org_id?: string
  model_name?: string
  period?: string
  gpu_hours?: number
  kwh?: number
  tokens_generated?: number
  efficiency_score?: number
  renewable_percent?: number
  compute_provider?: string
  measurement_source?: string
  pue?: number
  notes?: string
  metadata?: Record<string,any>
  recorded_at?: string
  created_at: string
  updated_at: string
}

export async function fetchAllEnergyMetrics(filters: Record<string,any> = {}): Promise<EnergyMetric[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    let q = supabase.from('energy_metrics').select('*').order('created_at', { ascending: false })
    if (filters.period) q = q.eq('period', filters.period)
    const { data, error } = await q
    if (error) { console.warn('[energyService] fetch:', error.message); return [] }
    return (data ?? []) as EnergyMetric[]
  } catch { return [] }
}

export async function upsertEnergyMetric(record: Partial<EnergyMetric>): Promise<EnergyMetric | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.from('energy_metrics').upsert(record).select().single()
    if (error) { console.warn('[energyService] upsert:', error.message); return null }
    return data as EnergyMetric
  } catch { return null }
}

export async function deleteEnergyMetric(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('energy_metrics').delete().eq('id', id)
    if (error) { console.warn('[energyService] delete:', error.message); return false }
    return true
  } catch { return false }
}

export const fetchEnergyMetrics = fetchAllEnergyMetrics
