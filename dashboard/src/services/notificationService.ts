import { supabase, isSupabaseConfigured } from '../lib/supabase'
const TENANT_ID = 'TNT-001'
export async function fetchNotifications(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('notifications').select('*').eq('tenant_id', TENANT_ID).order('created_at', { ascending: false })
    if (error) { console.warn('[notificationService] fetch failed:', error.message); return [] }
    return data || []
  } catch { return [] }
}
export async function upsertNotification(record: any): Promise<any> {
  try {
    const { data, error } = await supabase.from('notifications').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) { console.warn('[notificationService] upsert failed:', error.message); return record }
    return data
  } catch { return record }
}
export async function deleteNotification(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('notifications').delete().eq('id', id)
    if (error) { console.warn('[notificationService] delete failed:', error.message); return false }
    return true
  } catch { return false }
}
