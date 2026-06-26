import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type EsgReportRecord = {
  id: string
  org_id?: string
  title?: string
  period?: string
  framework?: string
  status?: string
  publishedDate?: string
  author?: string
  environmentalScore?: number
  socialScore?: number
  governanceScore?: number
  overallScore?: number
  highlights?: string[]
  aiSpecificMetrics?: any[]
  metadata?: Record<string, any>
  created_at: string
  updated_at: string
}

export async function fetchAllEsgReports(filters: Record<string, any> = {}): Promise<EsgReportRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    let q = supabase.from('esg_reports').select('*').order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    const { data, error } = await q
    if (error) { console.warn('[esgReportsService] fetch:', error.message); return [] }
    return (data ?? []) as EsgReportRecord[]
  } catch { return [] }
}

export async function upsertEsgReport(record: Partial<EsgReportRecord>): Promise<EsgReportRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  try {
    const { data, error } = await supabase
      .from('esg_reports')
      .upsert(record)
      .select()
      .single()
    if (error) { console.warn('[esgReportsService] upsert:', error.message); return null }
    return data as EsgReportRecord
  } catch { return null }
}

export async function deleteEsgReport(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('esg_reports').delete().eq('id', id)
    if (error) { console.warn('[esgReportsService] delete:', error.message); return false }
    return true
  } catch { return false }
}

export const fetchEsgReports = fetchAllEsgReports
export const saveEsgReport = upsertEsgReport
