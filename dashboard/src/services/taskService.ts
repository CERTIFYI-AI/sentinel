import { supabase, isSupabaseConfigured } from '../lib/supabase'

const TENANT_ID = 'default'

// Canonical task statuses the UI knows how to render. Anything the DB returns
// that falls outside this set is normalised so a stray/legacy value can never
// reach a status→style lookup and crash a render.
const KNOWN_TASK_STATUSES = new Set(['todo', 'in_progress', 'review', 'done', 'overdue', 'blocked'])
function normalizeStatus(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return 'todo'
  const s = raw.trim().toLowerCase().replace(/[\s-]+/g, '_') // "In Progress"/"in-progress" → "in_progress"
  if (KNOWN_TASK_STATUSES.has(s)) return s
  if (s === 'completed' || s === 'complete' || s === 'closed' || s === 'finished') return 'done'
  if (s === 'in_review' || s === 'reviewing') return 'review'
  if (s === 'wip' || s === 'doing' || s === 'started') return 'in_progress'
  if (s === 'on_hold' || s === 'waiting' || s === 'stuck') return 'blocked'
  if (s === 'pending' || s === 'new' || s === 'open' || s === 'queued' || s === 'backlog') return 'todo'
  // Truly unrecognised value: surface it as "unknown" (the render layer maps any
  // unknown key to a neutral "Unknown" badge) rather than silently masking it as
  // Todo — so bad data is visible, never hidden, and never crashes.
  return 'unknown'
}

const KNOWN_PRIORITIES = new Set(['critical', 'high', 'medium', 'low'])
function normalizePriority(raw: unknown): string {
  if (typeof raw !== 'string' || !raw.trim()) return 'medium'
  const p = raw.trim().toLowerCase()
  return KNOWN_PRIORITIES.has(p) ? p : 'medium'
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
    // Defensive mapping: never assume `data` is an array, never assume a row is a
    // complete object, and coerce nullable columns so the UI never receives null.
    const rows = Array.isArray(data) ? data : []
    return rows
      .filter((row: any) => row && typeof row === 'object')
      .map((row: any) => ({
        ...row,
        id: row.id ?? row.task_id ?? `task-${Math.random().toString(36).slice(2, 10)}`,
        assignee: row.assignee ?? '',
        title: row.title ?? '',
        description: row.description ?? '',
        source: row.source ?? '',
        dueDate: row.due_date ?? row.dueDate ?? '',
        status: normalizeStatus(row.status),
        priority: normalizePriority(row.priority),
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
