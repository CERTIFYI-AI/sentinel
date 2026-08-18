import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fromDB, mutateDB } from '@/lib/dataSource'


export async function fetchAllPolicyFirewall(filters: Record<string,any> = {}) {
  if (!isSupabaseConfigured()) return []
  try {
    let q = supabase.from('policy_firewall_rules').select('*').order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.type) q = q.eq('type', filters.type)
    const { data, error } = await q
    if (error) { console.warn('[policyFirewallService] fetch:', error.message); return [] }
    return data ?? []
  } catch { return [] }
}

export async function fetchPolicyFirewallById(id: string) {
  if (!isSupabaseConfigured() || !id) return null
  try {
    const { data, error } = await supabase.from('policy_firewall_rules').select('*').eq('id', id).single()
    if (error) return null
    return data
  } catch { return null }
}

export async function upsertPolicyFirewall(record: any) {
  if (!isSupabaseConfigured()) return record
  try {
    const { data, error } = await supabase.from('policy_firewall_rules').upsert(record).select().single()
    if (error) throw error
    return data
  } catch (e) { console.warn('[policyFirewallService] upsert:', e); return record }
}

export async function deletePolicyFirewall(id: string) {
  if (!isSupabaseConfigured()) return true
  try {
    const { error } = await supabase.from('policy_firewall_rules').delete().eq('id', id)
    if (error) throw error
    return true
  } catch { return false }
}
