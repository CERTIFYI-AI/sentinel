import { supabase } from '../lib/supabase'

export async function fetchSecurityScans() {
  const { data, error } = await supabase.from('security_scans').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return data ?? []
}

export async function fetchSecurityThreats() {
  const { data, error } = await supabase.from('security_threats').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return data ?? []
}

export async function fetchSecurityVulnerabilities() {
  const { data, error } = await supabase.from('security_vulnerabilities').select('*').order('created_at', { ascending: false }).limit(100)
  if (error) throw error
  return data ?? []
}

export async function fetchApiKeys() {
  const { data, error } = await supabase.from('api_keys').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function upsertApiKey(record: any) {
  const { data, error } = await supabase.from('api_keys').upsert(record).select().single()
  if (error) throw error
  return data
}

export async function deleteApiKey(id: string) {
  const { error } = await supabase.from('api_keys').delete().eq('id', id)
  if (error) throw error
}

export async function fetchGuardrails() {
  const { data, error } = await supabase.from('guardrails').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}

export async function upsertGuardrail(record: any) {
  const { data, error } = await supabase.from('guardrails').upsert(record).select().single()
  if (error) throw error
  return data
}

export async function deleteGuardrail(id: string) {
  const { error } = await supabase.from('guardrails').delete().eq('id', id)
  if (error) throw error
}

export async function fetchRedTeamCampaigns() {
  const { data, error } = await supabase.from('red_team_campaigns').select('*').order('created_at', { ascending: false })
  if (error) throw error
  return data ?? []
}
