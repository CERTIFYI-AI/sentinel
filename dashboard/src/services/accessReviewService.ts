// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// accessReviewService — Identity Governance access reviews on the real,
// org-scoped `access_reviews` table (supabase/migrations/040_v1_missing_
// modules.sql; system interlinks added in 20260825000001_last_demo_table_
// retirement.sql).
//
// Replaces the `iga_table (id, doc jsonb)` demo table the page used to write
// to. The old page invented a directory of ten named people with fabricated
// "risk flags" ("Orphaned account — no login 102 days"), an
// "avgReviewCompletion" percentage, and a MOCK_CAMPAIGNS array — none of it
// measured. It keyed identities by a business code (`IGA-001`) and reached no
// real user or system.
//
// This service governs the access-REVIEW record (SOC 2 CC6.3 / ISO 27001
// A.5.18 certification), which is what `access_reviews` actually models — who
// reviewed whom, over what system, with what decision. Identity CRUD itself
// lives in Access Control (user_profiles); a review points at those records
// rather than duplicating them.
//
// Contract: org_id filled by the DB default; writes THROW; reads throw; every
// mutation writes an Art. 12 audit entry.
//
// Interlinks (one id-space): reviewer_id / subject_user_id → user_profiles.id;
// linked_model_id → ai_models.id; linked_asset_id → assets.id. All resolved to
// display names at render; a null id renders "—", an unresolvable one
// "Unavailable".

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

const MODULE = 'identity-governance'

export type ReviewType = 'user_access' | 'role_certification' | 'entitlement' | 'sod_check' | 'privileged'
export type ReviewStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled' | 'overdue'
export type ReviewDecision = 'approved' | 'revoked' | 'modified' | 'deferred' | null

export interface AccessReview {
  id: string
  reviewRef: string | null
  name: string
  type: ReviewType
  status: ReviewStatus
  reviewerId: string | null
  subjectUserId: string | null
  scope: string | null
  riskLevel: string | null
  dueDate: string | null
  completedAt: string | null
  decision: ReviewDecision
  decisionNotes: string | null
  frameworkRef: string | null
  /** The AI system whose access this review certifies — ai_models.id. */
  linkedModelId: string | null
  /** The asset whose access this review certifies — assets.id. */
  linkedAssetId: string | null
  createdAt: string
  updatedAt: string
}

function rowToReview(r: Record<string, any>): AccessReview {
  return {
    id: r.id,
    reviewRef: r.review_ref ?? null,
    name: r.name ?? '',
    type: (r.type ?? 'user_access') as ReviewType,
    status: (r.status ?? 'pending') as ReviewStatus,
    reviewerId: r.reviewer_id ?? null,
    subjectUserId: r.subject_user_id ?? null,
    scope: r.scope ?? null,
    riskLevel: r.risk_level ?? null,
    dueDate: r.due_date ?? null,
    completedAt: r.completed_at ?? null,
    decision: (r.decision ?? null) as ReviewDecision,
    decisionNotes: r.decision_notes ?? null,
    frameworkRef: r.framework_ref ?? null,
    linkedModelId: r.linked_model_id ?? null,
    linkedAssetId: r.linked_asset_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function reviewToRow(a: Partial<AccessReview>): Record<string, any> {
  const row: Record<string, any> = {}
  const set = (k: string, v: unknown) => { if (v !== undefined) row[k] = v }
  set('review_ref', a.reviewRef)
  set('name', a.name)
  set('type', a.type)
  set('status', a.status)
  set('reviewer_id', a.reviewerId)
  set('subject_user_id', a.subjectUserId)
  set('scope', a.scope)
  set('risk_level', a.riskLevel)
  set('due_date', a.dueDate)
  set('completed_at', a.completedAt)
  set('decision', a.decision)
  set('decision_notes', a.decisionNotes)
  set('framework_ref', a.frameworkRef)
  set('linked_model_id', a.linkedModelId)
  set('linked_asset_id', a.linkedAssetId)
  return row
}

export async function fetchAccessReviews(filters: { modelId?: string } = {}): Promise<AccessReview[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('access_reviews').select('*').order('created_at', { ascending: false })
  if (filters.modelId) q = q.eq('linked_model_id', filters.modelId)
  const { data, error } = await q
  if (error) { console.warn('[accessReviewService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(rowToReview)
}

export async function createAccessReview(record: Partial<AccessReview>): Promise<AccessReview> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot create access review.')
  const row = reviewToRow(record)
  const { data, error } = await supabase.from('access_reviews').insert(row).select().single()
  if (error) { console.warn('[accessReviewService] create:', error.message); throw new Error(error.message) }
  const saved = rowToReview(data)
  void logAction({
    module: MODULE, entityType: 'access_review', entityId: saved.id,
    entityName: saved.name, action: 'create', newValues: row,
  })
  return saved
}

export async function updateAccessReview(id: string, patch: Partial<AccessReview>): Promise<AccessReview> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot update access review.')
  const row = reviewToRow(patch)
  row.updated_at = new Date().toISOString()
  const { data, error } = await supabase.from('access_reviews').update(row).eq('id', id).select().single()
  if (error) { console.warn('[accessReviewService] update:', error.message); throw new Error(error.message) }
  const saved = rowToReview(data)
  void logAction({
    module: MODULE, entityType: 'access_review', entityId: id,
    entityName: saved.name, action: 'update', newValues: row,
  })
  return saved
}

/** Record the certification outcome — completes the review and stamps completed_at. */
export async function recordReviewDecision(id: string, decision: Exclude<ReviewDecision, null>, notes?: string): Promise<AccessReview> {
  return updateAccessReview(id, {
    decision, decisionNotes: notes ?? undefined,
    status: 'completed', completedAt: new Date().toISOString(),
  })
}

export async function deleteAccessReview(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete access review.')
  const { error } = await supabase.from('access_reviews').delete().eq('id', id)
  if (error) { console.warn('[accessReviewService] delete:', error.message); throw new Error(error.message) }
  void logAction({ module: MODULE, entityType: 'access_review', entityId: id, action: 'delete' })
}
