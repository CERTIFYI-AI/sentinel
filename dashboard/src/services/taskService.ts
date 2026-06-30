import { supabase, isSupabaseConfigured } from '../lib/supabase'

const TENANT_ID = 'default'

// Canonical task statuses the UI knows how to render. Anything the DB returns
// that falls outside this set is normalised so a stray/legacy value can never
// reach a status→style lookup and crash a render.
const KNOWN_TASK_STATUSES = new Set(['todo', 'in_progress', 'review', 'done', 'overdue', 'blocked'])
function normalizeStatus(raw: unknown): string {
  if (typeof raw !== 'string' || !raw) return 'todo'
  const s = raw.trim().toLowerCase().replace(/[\s-]+/g, '_') // "In Progress"/"in-progress" → "in_progress"
  if (KNOWN_TASK_STATUSES.has(s)) return s
  if (s === 'completed' || s === 'complete' || s === 'closed') return 'done'
  if (s === 'in_review' || s === 'reviewing') return 'review'
  if (s === 'pending' || s === 'new' || s === 'open') return 'todo'
  return 'todo'
}

export async function fetchAllTasks(filters: Record<string,any> = {}): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.warn('[taskService] fetch failed:', error.message)
      return []
    }
    // Normalise rows: coerce nullable string columns to '' so UI never receives null
    return (data ?? []).map((row: any) => ({
      ...row,
      assignee: row.assignee ?? '',
      title: row.title ?? '',
      description: row.description ?? '',
      source: row.source ?? '',
      dueDate: row.due_date ?? row.dueDate ?? '',
      status: normalizeStatus(row.status),
      priority: row.priority ?? 'medium',
    }))
  } catch (e) { return [] }
}

export async function upsertTask(record: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) return record
  try {
    const { data, error } = await supabase
      .from('tasks')
      .upsert({ ...record, tenant_id: TENANT_ID })
      .select()
      .single()
    if (error) { console.warn('[taskService] upsert failed:', error.message); return record }
    return data
  } catch (e) { return record }
}

export async function deleteTask(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) return false
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('tenant_id', TENANT_ID)
    if (error) { console.warn('[taskService] delete failed:', error.message); return false }
    return true
  } catch (e) { return false }
}

// Backward-compatible aliases
export const fetchTasks = fetchAllTasks
export const saveTask = upsertTask
