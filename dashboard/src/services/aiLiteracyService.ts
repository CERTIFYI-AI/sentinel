// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// AI literacy / training registry (`ai_trainings`) — competence tracking for
// staff who build, validate, operate or supervise AI systems (EU AI Act Art.4
// benchmark, ISO/IEC 42001 A.4.4). Org-scoped via RLS with the tenant column
// defaulted DB-side; writes throw so the UI can never report a false success.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

export type TrainingFormat = 'live' | 'e_learning' | 'workshop' | 'certification'
export type TrainingStatus = 'planned' | 'in_progress' | 'completed' | 'archived'
export type AttendeeStatus = 'enrolled' | 'in_progress' | 'completed' | 'exempted' | 'dropped'

export interface TrainingAttendee {
  name: string
  role?: string
  status: AttendeeStatus
  completedAt?: string
}

export interface TrainingRecord {
  id: string
  trainingRef: string
  name: string
  description?: string
  provider?: string
  format: TrainingFormat
  audience?: string
  durationHours?: number
  status: TrainingStatus
  startsOn?: string
  endsOn?: string
  ownerName?: string
  linkedPolicyId?: string | null
  linkedModelIds: string[]
  frameworkRefs: string[]
  attendees: TrainingAttendee[]
  createdAt?: string
  updatedAt?: string
}

function fromRow(r: Record<string, any>): TrainingRecord {
  return {
    id: r.id,
    trainingRef: r.training_ref ?? '',
    name: r.name ?? '',
    description: r.description ?? undefined,
    provider: r.provider ?? undefined,
    format: (r.format ?? 'e_learning') as TrainingFormat,
    audience: r.audience ?? undefined,
    durationHours: r.duration_hours != null ? Number(r.duration_hours) : undefined,
    status: (r.status ?? 'planned') as TrainingStatus,
    startsOn: r.starts_on ?? undefined,
    endsOn: r.ends_on ?? undefined,
    ownerName: r.owner_name ?? undefined,
    linkedPolicyId: r.linked_policy_id ?? null,
    linkedModelIds: Array.isArray(r.linked_model_ids) ? r.linked_model_ids : [],
    frameworkRefs: Array.isArray(r.framework_refs) ? r.framework_refs : [],
    attendees: Array.isArray(r.attendees) ? r.attendees : [],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toRow(t: Partial<TrainingRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (t.trainingRef !== undefined) row.training_ref = t.trainingRef
  if (t.name !== undefined) row.name = t.name
  if (t.description !== undefined) row.description = t.description ?? null
  if (t.provider !== undefined) row.provider = t.provider ?? null
  if (t.format !== undefined) row.format = t.format
  if (t.audience !== undefined) row.audience = t.audience ?? null
  if (t.durationHours !== undefined) row.duration_hours = t.durationHours ?? null
  if (t.status !== undefined) row.status = t.status
  if (t.startsOn !== undefined) row.starts_on = t.startsOn || null
  if (t.endsOn !== undefined) row.ends_on = t.endsOn || null
  if (t.ownerName !== undefined) row.owner_name = t.ownerName ?? null
  if (t.linkedPolicyId !== undefined) row.linked_policy_id = t.linkedPolicyId || null
  if (t.linkedModelIds !== undefined) row.linked_model_ids = t.linkedModelIds
  if (t.frameworkRefs !== undefined) row.framework_refs = t.frameworkRefs
  if (t.attendees !== undefined) row.attendees = t.attendees
  return row
}

export async function fetchTrainings(): Promise<TrainingRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('ai_trainings')
    .select('*')
    .eq('is_deleted', false)
    .order('updated_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(fromRow)
}

export async function createTraining(t: Partial<TrainingRecord>): Promise<TrainingRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase.from('ai_trainings').insert(toRow(t)).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'ai-literacy', entityType: 'ai_trainings', entityId: data.id, action: 'create' })
  return fromRow(data)
}

export async function updateTraining(id: string, patch: Partial<TrainingRecord>): Promise<TrainingRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase
    .from('ai_trainings')
    .update({ ...toRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'ai-literacy', entityType: 'ai_trainings', entityId: id, action: 'update' })
  return fromRow(data)
}

export async function softDeleteTraining(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase
    .from('ai_trainings')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'ai-literacy', entityType: 'ai_trainings', entityId: id, action: 'delete' })
}
