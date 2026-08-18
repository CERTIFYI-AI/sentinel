import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fromDB, mutateDB } from '@/lib/dataSource'


export async function fetchAllRedTeamFindings(filters: Record<string,any> = {}) {
  if (!isSupabaseConfigured()) return []
  try {
    let q = supabase.from('red_team_findings').select('*, campaign:red_team_campaigns(id,name)').order('created_at', { ascending: false })
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.type) q = q.eq('type', filters.type)
    const { data, error } = await q
    if (error) { console.warn('[redTeamFindingsService] fetch:', error.message); return [] }
    return data ?? []
  } catch { return [] }
}

export async function fetchRedTeamFindingsById(id: string) {
  if (!isSupabaseConfigured() || !id) return null
  try {
    const { data, error } = await supabase.from('red_team_findings').select('*').eq('id', id).single()
    if (error) return null
    return data
  } catch { return null }
}

export async function upsertRedTeamFindings(record: any) {
  if (!isSupabaseConfigured()) return record
  try {
    const { data, error } = await supabase.from('red_team_findings').upsert(record).select().single()
    if (error) throw error
    return data
  } catch (e) { console.warn('[redTeamFindingsService] upsert:', e); return record }
}

export async function deleteRedTeamFindings(id: string) {
  if (!isSupabaseConfigured()) return true
  try {
    const { error } = await supabase.from('red_team_findings').delete().eq('id', id)
    if (error) throw error
    return true
  } catch { return false }
}
