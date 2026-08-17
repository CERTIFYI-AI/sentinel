// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// vendorAssessmentService — the real, org-scoped `public.vendor_assessments`
// table (supabase/migrations/20260822000001_tprm_supply_esg_foundation.sql).
//
// This replaces the generic `vendorassessments_table (id, doc jsonb)` demo
// table, whose RLS predicate was `true` for `authenticated` — i.e. full
// cross-tenant read/write of every customer's vendor assessments.
//
// Vendors are referenced by `vendor_id uuid` (vendors.id) — never by name and
// never by a business code. The vendor's display name resolves at render time.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

export type AssessmentStatus =
  | 'draft' | 'in_progress' | 'submitted' | 'under_review'
  | 'approved' | 'approved_with_conditions' | 'rejected' | 'expired'

export const ASSESSMENT_STATUSES: AssessmentStatus[] = [
  'draft', 'in_progress', 'submitted', 'under_review',
  'approved', 'approved_with_conditions', 'rejected', 'expired',
]

export const ASSESSMENT_TYPES = ['initial', 'periodic', 'targeted', 'incident_driven'] as const
export const ASSESSMENT_FRAMEWORKS = [
  'SIG Lite', 'CAIQ', 'ISO 42001 addendum', 'ISO 27001', 'SOC 2', 'GDPR', 'custom',
]

export interface VendorAssessmentRecord {
  id: string
  assessmentRef?: string | null
  vendorId?: string | null
  assessmentType?: string | null
  framework?: string | null
  scope?: string | null
  status: AssessmentStatus
  /** Required by the review gate when status is approved_with_conditions. */
  conditions?: string | null
  score?: number | null
  residualRisk?: string | null
  findingsCritical: number
  findingsHigh: number
  findingsMedium: number
  findingsLow: number
  owner?: string | null
  /** Distinct from owner — who actually signed off (EU AI Act Art. 14). */
  approver?: string | null
  approvedBy?: string | null
  dueAt?: string | null
  submittedAt?: string | null
  reviewedAt?: string | null
  approvedAt?: string | null
  nextReviewAt?: string | null
  recommendation?: string | null
  questionnaireId?: string | null
  evidenceIds: string[]
  notes?: string | null
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

function fromRow(r: Record<string, any>): VendorAssessmentRecord {
  return {
    id: r.id,
    assessmentRef: r.assessment_ref ?? null,
    vendorId: r.vendor_id ?? null,
    assessmentType: r.assessment_type ?? null,
    framework: r.framework ?? null,
    scope: r.scope ?? null,
    status: (r.status ?? 'draft') as AssessmentStatus,
    conditions: r.conditions ?? null,
    score: numOrNull(r.score),
    residualRisk: r.residual_risk ?? null,
    findingsCritical: Number(r.findings_critical ?? 0),
    findingsHigh: Number(r.findings_high ?? 0),
    findingsMedium: Number(r.findings_medium ?? 0),
    findingsLow: Number(r.findings_low ?? 0),
    owner: r.owner ?? null,
    approver: r.approver ?? null,
    approvedBy: r.approved_by ?? null,
    dueAt: r.due_at ?? null,
    submittedAt: r.submitted_at ?? null,
    reviewedAt: r.reviewed_at ?? null,
    approvedAt: r.approved_at ?? null,
    nextReviewAt: r.next_review_at ?? null,
    recommendation: r.recommendation ?? null,
    questionnaireId: r.questionnaire_id ?? null,
    evidenceIds: Array.isArray(r.evidence_ids) ? r.evidence_ids : [],
    notes: r.notes ?? null,
    metadata: r.metadata ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** org_id omitted on purpose — the DB default current_user_org_id() fills it. */
function toRow(a: Partial<VendorAssessmentRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  const set = (col: string, val: unknown) => { if (val !== undefined) row[col] = val }
  set('assessment_ref', a.assessmentRef)
  set('vendor_id', a.vendorId || null)
  set('assessment_type', a.assessmentType)
  set('framework', a.framework)
  set('scope', a.scope)
  set('status', a.status)
  set('conditions', a.conditions)
  set('score', a.score)
  set('residual_risk', a.residualRisk)
  set('findings_critical', a.findingsCritical)
  set('findings_high', a.findingsHigh)
  set('findings_medium', a.findingsMedium)
  set('findings_low', a.findingsLow)
  set('owner', a.owner)
  set('approver', a.approver)
  set('approved_by', a.approvedBy || null)
  set('due_at', a.dueAt || null)
  set('submitted_at', a.submittedAt || null)
  set('reviewed_at', a.reviewedAt || null)
  set('approved_at', a.approvedAt || null)
  set('next_review_at', a.nextReviewAt || null)
  set('recommendation', a.recommendation)
  set('questionnaire_id', a.questionnaireId || null)
  set('evidence_ids', a.evidenceIds)
  set('notes', a.notes)
  set('metadata', a.metadata)
  row.updated_at = new Date().toISOString()
  return row
}

export async function fetchVendorAssessments(vendorId?: string): Promise<VendorAssessmentRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('vendor_assessments').select('*').order('created_at', { ascending: false })
  if (vendorId) q = q.eq('vendor_id', vendorId)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map(fromRow)
}

export async function fetchVendorAssessmentById(id: string): Promise<VendorAssessmentRecord | null> {
  if (!isSupabaseConfigured() || !supabase || !id) return null
  const { data, error } = await supabase.from('vendor_assessments').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? fromRow(data) : null
}

export async function createVendorAssessment(
  a: Partial<VendorAssessmentRecord>,
): Promise<VendorAssessmentRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save assessment.')
  if (!a.vendorId) throw new Error('An assessment must reference a vendor.')
  const { data, error } = await supabase.from('vendor_assessments').insert(toRow(a)).select().single()
  if (error) throw new Error(error.message)
  const saved = fromRow(data)
  void logAction({
    module: 'vendors', entityType: 'vendor_assessments', entityId: saved.id,
    entityName: saved.assessmentRef ?? undefined, action: 'create', newValues: toRow(a),
  })
  return saved
}

export async function updateVendorAssessment(
  id: string, patch: Partial<VendorAssessmentRecord>,
): Promise<VendorAssessmentRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save assessment.')
  const before = await fetchVendorAssessmentById(id)
  const row = toRow(patch)
  const { data, error } = await supabase.from('vendor_assessments').update(row).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  const saved = fromRow(data)
  void logAction({
    module: 'vendors', entityType: 'vendor_assessments', entityId: saved.id,
    entityName: saved.assessmentRef ?? undefined, action: 'update',
    oldValues: before ?? undefined, newValues: row,
  })
  return saved
}

/**
 * Record a review decision. The approver identity is mandatory: an approval
 * with no named approver is not an approval (EU AI Act Art. 14 human
 * oversight, Art. 12 traceability). `approved_with_conditions` additionally
 * requires the conditions text — otherwise the condition is unenforceable.
 */
export async function decideVendorAssessment(params: {
  id: string
  decision: Extract<AssessmentStatus, 'approved' | 'approved_with_conditions' | 'rejected'>
  approver: string
  conditions?: string
  residualRisk?: string
  notes?: string
}): Promise<VendorAssessmentRecord> {
  const approver = params.approver?.trim()
  if (!approver) throw new Error('An approver must be named before a decision can be recorded.')
  if (params.decision === 'approved_with_conditions' && !params.conditions?.trim()) {
    throw new Error('Conditions are required when approving with conditions.')
  }
  const now = new Date().toISOString()
  const saved = await updateVendorAssessment(params.id, {
    status: params.decision,
    approver,
    conditions: params.conditions ?? undefined,
    residualRisk: params.residualRisk ?? undefined,
    notes: params.notes ?? undefined,
    reviewedAt: now,
    approvedAt: params.decision === 'rejected' ? undefined : now,
  })
  void logAction({
    module: 'vendors', entityType: 'vendor_assessments', entityId: saved.id,
    entityName: saved.assessmentRef ?? undefined, action: `decision.${params.decision}`,
    newValues: { approver, decision: params.decision, conditions: params.conditions ?? null },
  })
  return saved
}

export async function deleteVendorAssessment(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete assessment.')
  const before = await fetchVendorAssessmentById(id)
  const { error } = await supabase.from('vendor_assessments').delete().eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({
    module: 'vendors', entityType: 'vendor_assessments', entityId: id,
    entityName: before?.assessmentRef ?? undefined, action: 'delete', oldValues: before ?? undefined,
  })
}
