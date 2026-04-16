import { supabase } from '../lib/supabase'

export async function fetchExplainabilityReports() {
  const { data, error } = await supabase.from('explainability_reports').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return data ?? []
}

export async function fetchExplainabilityReportById(id: string) {
  const { data, error } = await supabase.from('explainability_reports').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function upsertExplainabilityReport(record: any) {
  const { data, error } = await supabase.from('explainability_reports').upsert(record).select().single()
  if (error) throw error
  return data
}
