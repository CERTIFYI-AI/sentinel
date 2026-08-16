// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Governance tasks (`tasks`) — the platform's work queue. Org-scoped via RLS
// with tenant_id defaulted DB-side (the client never sends it), camelCase↔
// snake_case mapped, and writes that THROW on failure so the UI can never
// report a false success.
//
// The UI's flat Task shape maps onto the richer table as follows:
//   assignee            ↔ assignees[0]        (array column, first holder)
//   dueDate             ↔ due_date
//   sourceType/sourceId ↔ linked_entity_type / linked_entity_id (canonical interlink)
//   source/sourceLink   ↔ linked_items jsonb  (display label + deep link)

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

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

/** Flatten a task row into the shape the board and table render. */
function fromRow(row: Record<string, any>): Record<string, any> {
  const linked = (row.linked_items ?? {}) as Record<string, any>
  const assignees: string[] = Array.isArray(row.assignees) ? row.assignees : []
  return {
    ...row,
    id: row.id,
    title: row.title ?? '',
    description: row.description ?? '',
    status: normalizeStatus(row.status),
    priority: normalizePriority(row.priority),
    assignee: assignees[0] ?? '',
    assignees,
    dueDate: row.due_date ?? '',
    source: linked.source ?? '',
    sourceType: linked.sourceType ?? row.linked_entity_type ?? '',
    sourceLink: linked.sourceLink ?? '',
    linkedEntityType: row.linked_entity_type ?? null,
    linkedEntityId: row.linked_entity_id ?? null,
    slaDueAt: row.sla_due_at ?? null,
    slaBreached: !!row.sla_breached,
  }
}

/**
 * Project the UI shape back onto real columns. Unknown keys are dropped rather
 * than sent — Postgres rejects unknown columns, and the old code swallowed that
 * error, which is what made failed writes look successful.
 */
function toRow(rec: Record<string, any>): Record<string, any> {
  const row: Record<string, any> = {}
  if (rec.id !== undefined) row.id = rec.id
  if (rec.title !== undefined) row.title = rec.title
  if (rec.description !== undefined) row.description = rec.description
  if (rec.status !== undefined) row.status = rec.status
  if (rec.priority !== undefined) row.priority = rec.priority
  if (rec.dueDate !== undefined || rec.due_date !== undefined) {
    const due = rec.dueDate ?? rec.due_date
    row.due_date = due ? new Date(due).toISOString() : null
  }
  if (rec.assignees !== undefined) row.assignees = rec.assignees
  else if (rec.assignee !== undefined) row.assignees = rec.assignee ? [rec.assignee] : []
  if (rec.linkedEntityType !== undefined) row.linked_entity_type = rec.linkedEntityType || null
  if (rec.linkedEntityId !== undefined) row.linked_entity_id = rec.linkedEntityId || null
  if (rec.source !== undefined || rec.sourceLink !== undefined || rec.sourceType !== undefined) {
    row.linked_items = {
      source: rec.source ?? '',
      sourceType: rec.sourceType ?? '',
      sourceLink: rec.sourceLink ?? '',
    }
  }
  return row
}

export async function fetchAllTasks(_filters: Record<string, any> = {}): Promise<any[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('tasks')
    .select('*')
    .eq('is_deleted', false)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  const rows = Array.isArray(data) ? data : []
  return rows.filter((row: any) => row && typeof row === 'object').map(fromRow)
}

export async function upsertTask(record: Record<string, unknown>): Promise<any> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  // tenant_id is intentionally omitted: the DB default (current_user_org_id())
  // fills it, so a client can never write into another org.
  const { data, error } = await supabase
    .from('tasks')
    .upsert({ ...toRow(record as Record<string, any>), updated_at: new Date().toISOString() })
    .select()
    .single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'tasks', entityType: 'tasks', entityId: String(data.id), action: 'update' })
  return fromRow(data)
}

export async function deleteTask(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  // Soft-delete, and let RLS scope the row rather than a client-side tenant filter.
  const { error } = await supabase
    .from('tasks')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'tasks', entityType: 'tasks', entityId: id, action: 'delete' })
  return true
}

// Backward-compatible aliases
export const fetchTasks = fetchAllTasks
export const saveTask = upsertTask
