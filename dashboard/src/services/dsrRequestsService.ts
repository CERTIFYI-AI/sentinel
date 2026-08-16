// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Data Subject Requests (`dsar_requests`) — GDPR Arts. 15–22 rights requests
// (access, rectification, erasure, restriction, portability, objection) with
// the statutory one-month response clock.
//
// Previously this service:
//   * wrote `tenant_id` — a column that does not exist on `dsar_requests`
//     (the table is scoped by `org_id`), so EVERY save failed at the database;
//   * caught that error and returned the input record, so the UI reported
//     success and the operator believed the request had been logged;
//   * swallowed read errors into an empty list, rendering a failed fetch as
//     "no requests".
//
// For a statutory rights register that is the most damaging possible defect:
// an unlogged erasure request is a missed deadline. Writes now throw.

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { logAction } from '@/lib/auditLogger'

export const DSR_REQUEST_TYPES = [
  'access', 'rectification', 'erasure', 'restriction', 'portability', 'objection',
] as const
export type DsrRequestType = (typeof DSR_REQUEST_TYPES)[number]

export interface DsrRequest {
  id: string
  requesterName: string
  requesterEmail?: string
  requestType: string
  /** Page-facing aliases over requester_name / requester_email / request_type. */
  subject?: string
  email?: string
  type?: string
  description?: string
  status: string
  priority?: string
  /** Statutory response deadline — one month from receipt under Art. 12(3). */
  dueDate?: string | null
  completedAt?: string | null
  notes?: string
  datasetId?: string | null
  regulation?: string
  /** AI systems that actually hold this subject's data — the actionable link. */
  aiSystemsAffected: string[]
  linkedModelIds: string[]
  assignee?: string
  submittedDate?: string | null
  /**
   * Days left on the statutory clock, derived from due_date at read time —
   * never stored, so it cannot drift. Null when no deadline is recorded.
   */
  daysRemaining: number | null
  createdAt?: string
  updatedAt?: string
}

function fromRow(r: Record<string, any>): DsrRequest {
  return {
    id: r.id,
    requesterName: r.requester_name ?? '',
    requesterEmail: r.requester_email ?? undefined,
    requestType: r.request_type ?? 'access',
    subject: r.requester_name ?? undefined,
    email: r.requester_email ?? undefined,
    type: r.request_type ?? undefined,
    description: r.description ?? undefined,
    status: r.status ?? 'new',
    priority: r.priority ?? undefined,
    dueDate: r.due_date ?? null,
    completedAt: r.completed_at ?? null,
    notes: r.notes ?? undefined,
    datasetId: r.dataset_id ?? null,
    regulation: r.regulation ?? undefined,
    aiSystemsAffected: Array.isArray(r.ai_systems_affected) ? r.ai_systems_affected : [],
    linkedModelIds: Array.isArray(r.linked_model_ids) ? r.linked_model_ids : [],
    assignee: r.assignee ?? undefined,
    submittedDate: r.submitted_date ?? null,
    daysRemaining: r.due_date
      ? Math.ceil((new Date(r.due_date).getTime() - Date.now()) / 86_400_000)
      : null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/**
 * Project onto real columns. `org_id` is deliberately absent: the DB default
 * (`current_user_org_id()`) fills it, and the client must never choose a tenant.
 */
function toRow(d: Partial<DsrRequest>): Record<string, any> {
  const row: Record<string, any> = {}
  if (d.id !== undefined) row.id = d.id
  if (d.requesterName !== undefined) row.requester_name = d.requesterName
  if (d.requesterEmail !== undefined) row.requester_email = d.requesterEmail ?? null
  if (d.requestType !== undefined) row.request_type = d.requestType
  else if (d.type !== undefined) row.request_type = d.type
  if (d.subject !== undefined) row.requester_name = d.subject
  if (d.email !== undefined) row.requester_email = d.email
  if (d.description !== undefined) row.description = d.description ?? null
  if (d.status !== undefined) row.status = d.status
  if (d.priority !== undefined) row.priority = d.priority ?? null
  if (d.dueDate !== undefined) row.due_date = d.dueDate || null
  if (d.completedAt !== undefined) row.completed_at = d.completedAt || null
  if (d.notes !== undefined) row.notes = d.notes ?? null
  if (d.datasetId !== undefined) row.dataset_id = d.datasetId || null
  if (d.regulation !== undefined) row.regulation = d.regulation ?? null
  if (d.aiSystemsAffected !== undefined) row.ai_systems_affected = d.aiSystemsAffected
  if (d.linkedModelIds !== undefined) row.linked_model_ids = d.linkedModelIds
  if (d.assignee !== undefined) row.assignee = d.assignee ?? null
  if (d.submittedDate !== undefined) row.submitted_date = d.submittedDate || null
  return row
}

export async function fetchAllDsrRequests(filters: Record<string, any> = {}): Promise<DsrRequest[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('dsar_requests').select('*').order('created_at', { ascending: false })
  if (filters.status) q = q.eq('status', filters.status)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map(fromRow)
}

export async function fetchDsrRequest(id: string): Promise<DsrRequest | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase.from('dsar_requests').select('*').eq('id', id).single()
  if (error) throw new Error(error.message)
  return data ? fromRow(data) : null
}

export async function upsertDsrRequests(record: Partial<DsrRequest>): Promise<DsrRequest> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase
    .from('dsar_requests')
    .upsert({ ...toRow(record), updated_at: new Date().toISOString() })
    .select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'privacy', entityType: 'dsar_requests', entityId: String(data.id), action: 'update' })
  return fromRow(data)
}

export async function deleteDsrRequests(id: string): Promise<boolean> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase.from('dsar_requests').delete().eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'privacy', entityType: 'dsar_requests', entityId: id, action: 'delete' })
  return true
}
