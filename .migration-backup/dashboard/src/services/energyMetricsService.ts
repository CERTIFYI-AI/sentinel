// @ts-nocheck
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type EnergyMetricRecord = {
  id: string
  org_id?: string
  model?: string
  period?: string
  gpuHours?: number
  kwh?: number
  tokensGenerated?: number
  efficiencyScore?: number
  renewablePercent?: number
  computeProvider?: string
  measurementSource?: string
  notes?: string
  date?: string
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export async function fetchAllEnergyMetrics(filters: Record<string, any> = {}): Promise<EnergyMetricRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    let q = supabase.from('energy_metrics').select('*').order('created_at', { ascending: false })
    if (filters.period) q = q.eq('period', filters.period)
    const { data, error } = await q
    if (error) { console.warn('[energyMetricsService] fetch:', error.message); return [] }
    return (data ?? []) as EnergyMetricRecord[]
  } catch { return [] }
}

export async function upsertEnergyMetric(record: Partial<EnergyMetricRecord>): Promise<EnergyMetricRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase
      .from('energy_metrics')
      .upsert(record)
      .select()
      .single()
    if (error) { console.warn('[energyMetricsService] upsert:', error.message); return null }
    return data as EnergyMetricRecord
  } catch { return null }
}

export async function deleteEnergyMetric(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('energy_metrics').delete().eq('id', id)
    if (error) { console.warn('[energyMetricsService] delete:', error.message); return false }
    return true
  } catch { return false }
}

export const fetchEnergyMetrics = fetchAllEnergyMetrics
export const saveEnergyMetric = upsertEnergyMetric
