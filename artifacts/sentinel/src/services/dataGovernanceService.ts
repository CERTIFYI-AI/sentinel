import { supabase } from '../lib/supabase'

export async function fetchDataAssets() {
  const { data, error } = await supabase.from('data_assets').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function upsertDataAsset(record: any) {
  const { data, error } = await supabase.from('data_assets').upsert(record).select().single()
  if (error) throw error
  return data
}

export async function deleteDataAsset(id: string) {
  const { error } = await supabase.from('data_assets').delete().eq('id', id)
  if (error) throw error
}

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
