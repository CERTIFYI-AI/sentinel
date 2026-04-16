import { supabase, isSupabaseConfigured } from '../lib/supabase'

const TENANT_ID = 'default'

export async function fetchAllNotifications(): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('tenant_id', TENANT_ID)
      .order('created_at', { ascending: false })
    if (error) { console.warn('[notificationService] fetch failed:', error.message); return [] }
    return data ?? []
  } catch (e) { return [] }
}

export async function upsertNotification(record: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase
      .from('notifications')
      .upsert({ ...record, tenant_id: TENANT_ID })
      .select()
      .single()
    if (error) { console.warn('[notificationService] upsert failed:', error.message); return record }
    return data
  } catch (e) { return record }
}

export async function deleteNotification(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)
      .eq('tenant_id', TENANT_ID)
    if (error) { console.warn('[notificationService] delete failed:', error.message); return false }
    return true
  } catch (e) { return false }
}

// Backward-compatible aliases
export const fetchNotifications = fetchAllNotifications
export const saveNotification = upsertNotification
export const fetchNotifications = fetchAllNotifications
