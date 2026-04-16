import { supabase, isSupabaseConfigured } from '../lib/supabase'
const TENANT_ID = 'TNT-001'
export async function fetchTasks(): Promise<any[]> {
  try {
    const { data, error } = await supabase.from('tasks').select('*').eq('tenant_id', TENANT_ID).order('created_at', { ascending: false })
    if (error) { console.warn('[taskService] fetch failed:', error.message); return [] }
    return data || []
  } catch { return [] }
}
export async function upsertTask(record: any): Promise<any> {
  try {
    const { data, error } = await supabase.from('tasks').upsert({ ...record, tenant_id: TENANT_ID }).select().single()
    if (error) { console.warn('[taskService] upsert failed:', error.message); return record }
    return data
  } catch { return record }
}
export async function deleteTask(id: string): Promise<boolean> {
  try {
    const { error } = await supabase.from('tasks').delete().eq('id', id)
    if (error) { console.warn('[taskService] delete failed:', error.message); return false }
    return true
  } catch { return false }
}
