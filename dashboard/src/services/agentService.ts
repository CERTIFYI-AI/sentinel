import { supabase, isSupabaseConfigured } from '../lib/supabase'

const TENANT_ID = 'default'

export async function fetchAllAgents(): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
    if (error) {
      if (error.message.includes('tenant_id')) {
        const { data: d2 } = await supabase.from('agents').select('*').order('created_at', { ascending: false })
        return d2 ?? []
      }
      console.warn('[agentService] fetch failed:', error.message); return []
    }
    return data ?? []
  } catch (e) { return [] }
}

export async function upsertAgent(record: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase
      .from('agents')
      .upsert({ ...record, tenant_id: TENANT_ID })
      .select()
      .single()
    if (error) {
      if (error.message.includes('tenant_id')) {
        const { data: d2 } = await supabase.from('agents').upsert(record).select().single()
        return d2 ?? record
      }
      console.warn('[agentService] upsert failed:', error.message); return record
    }
    return data
  } catch (e) { return record }
}

export async function deleteAgent(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('id', id)
    if (error) { console.warn('[agentService] delete failed:', error.message); return false }
    return true
  } catch (e) { return false }
}

// Backward-compatible aliases
export const fetchAgents = fetchAllAgents
export const saveAgent = upsertAgent
