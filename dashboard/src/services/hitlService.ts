import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Use HitlItem (PascalCase) - confirmed has data in Supabase
export async function fetchHitlItems(): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('HitlItem')
      .select('*')
      .order('createdAt', { ascending: false })
    if (error) { console.warn('[hitlService] fetch failed:', error.message); return [] }
    return data || []
  } catch (e) { return [] }
}

export async function upsertHitlItem(record: any): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase
      .from('HitlItem')
      .upsert(record)
      .select()
      .single()
    if (error) { console.warn('[hitlService] upsert failed:', error.message); return record }
    return data
  } catch (e) { return record }
}

export async function deleteHitlItem(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase.from('HitlItem').delete().eq('id', id)
    if (error) { console.warn('[hitlService] delete failed:', error.message); return false }
    return true
  } catch (e) { return false }
}

export const fetchHitlQueue = fetchHitlItems
export const saveHitlItem = upsertHitlItem
