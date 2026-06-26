import { supabase, isSupabaseConfigured } from '@/lib/supabase'

// Try Agent (PascalCase, confirmed has data) first, then agents as fallback
export async function fetchAllAgents(filters: Record<string, any> = {}) {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    // Try Agent (PascalCase) first — confirmed has data
    let q = supabase.from('Agent').select('*').order('createdAt', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.type) q = q.eq('type', filters.type)
    const { data, error } = await q
    if (!error && data && data.length > 0) return data

    // Fallback to agents (snake_case)
    let q2 = supabase.from('agents').select('*').order('created_at', { ascending: false })
    if (filters.status) q2 = q2.eq('status', filters.status)
    if (filters.type) q2 = q2.eq('type', filters.type)
    const { data: data2, error: error2 } = await q2
    if (error2) { console.warn('[agentsService] fetch:', error2.message); return [] }
    return data2 ?? []
  } catch { return [] }
}

export async function fetchAgentsById(id: string) {
  if (!isSupabaseConfigured() || !supabase || !id) return null
  try {
    const { data, error } = await supabase.from('Agent').select('*').eq('id', id).single()
    if (!error && data) return data
    const { data: data2 } = await supabase.from('agents').select('*').eq('id', id).single()
    return data2 ?? null
  } catch { return null }
}

export async function upsertAgents(record: any) {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase.from('Agent').upsert(record).select().single()
    if (error) throw error
    return data
  } catch (e) { console.warn('[agentsService] upsert:', e); return record }
}

export async function deleteAgents(id: string) {
  if (!isSupabaseConfigured() || !supabase) return true
  try {
    const { error } = await supabase.from('Agent').delete().eq('id', id)
    if (error) throw error
    return true
  } catch { return false }
}
