import { supabase } from '../lib/supabase'

export async function fetchDsarRequests() {
  const { data, error } = await supabase.from('dsar_requests').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return data ?? []
}

export async function upsertDsarRequest(record: any) {
  const { data, error } = await supabase.from('dsar_requests').upsert(record).select().single()
  if (error) throw error
  return data
}
