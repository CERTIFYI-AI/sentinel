import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { fromDB, mutateDB } from '@/lib/dataSource'


export async function fetchAllDepartments(filters: Record<string,any> = {}) {
  if (!isSupabaseConfigured()) return []
  let q = supabase.from('departments').select('*').order('created_at', { ascending: false })
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.type) q = q.eq('type', filters.type)
  const { data, error } = await q
  if (error) throw error
  return data ?? []
}

export async function fetchDepartmentsById(id: string) {
  if (!isSupabaseConfigured() || !id) return null
  const { data, error } = await supabase.from('departments').select('*').eq('id', id).single()
  if (error) throw error
  return data
}

export async function upsertDepartments(record: any) {
  if (!isSupabaseConfigured()) return record
  const { data, error } = await supabase.from('departments').upsert(record).select().single()
  if (error) throw error
  return data
}

export async function deleteDepartments(id: string) {
  if (!isSupabaseConfigured()) return true
  const { error } = await supabase.from('departments').delete().eq('id', id)
  if (error) throw error
  return true
}
