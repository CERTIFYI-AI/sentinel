// @ts-nocheck
import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type EsgReport = {
  id: string
  org_id?: string
  title: string
  period: string
  framework?: string
  status?: string
  author?: string
  environmental_score?: number
  social_score?: number
  governance_score?: number
  overall_score?: number
  highlights?: string[]
  ai_metrics?: Record<string,any>
  metadata?: Record<string,any>
  published_at?: string
  created_at: string
  updated_at: string
}

export async function fetchAllEsgReports(filters: Record<string,any> = {}): Promise<EsgReport[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    let q = supabase.from('esg_reports').select('*').order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    const { data, error } = await q
    if (error) { console.warn('[esgService] fetch:', error.message); return [] }
    return (data ?? []) as EsgReport[]
  } catch { return [] }
}

export async function upsertEsgReport(record: Partial<EsgReport>): Promise<EsgReport | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase.from('esg_reports').upsert(record).select().single()
    if (error) { console.warn('[esgService] upsert:', error.message); return null }
    return data as EsgReport
  } catch { return null }
}

export async function deleteEsgReport(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('esg_reports').delete().eq('id', id)
    if (error) { console.warn('[esgService] delete:', error.message); return false }
    return true
  } catch { return false }
}

export const fetchEsgReports = fetchAllEsgReports
