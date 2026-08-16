// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// DPIA register (`dpia_assessments`) — GDPR Article 35 data protection impact
// assessments, plus the Article 36 prior-consultation trigger.
//
// The DPIA page previously read the generic `dpia_table (id, doc jsonb)` demo
// table with local-only writes; no real table existed. Art. 35 assessments are
// the artefact a supervisory authority asks for first when high-risk processing
// is challenged, so writes throw and records are soft-deleted.

import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { logAction } from '@/lib/auditLogger'

// Vocabularies are fixed by check constraints on the table.
export const DPIA_STATUSES = ['draft', 'in_progress', 'pending_review', 'approved', 'rejected'] as const
export type DpiaStatus = (typeof DPIA_STATUSES)[number]

export const RISK_LEVELS = ['low', 'medium', 'high', 'critical'] as const
export type RiskLevel = (typeof RISK_LEVELS)[number]

export interface DpiaRecord {
  id: string
  reference?: string
  title: string
  description?: string
  processingPurpose?: string
  necessityJustification?: string
  dataCategories: string[]
  dataSubjects?: string
  riskLevel: RiskLevel
  identifiedRisks?: string
  mitigationMeasures?: string
  /** Residual risk after mitigation — drives the Art. 36 consultation trigger. */
  residualRiskLevel?: RiskLevel | null
  consultationRequired: boolean
  consultationDate?: string | null
  status: DpiaStatus
  dpoOpinion?: string
  dpoReviewedAt?: string | null
  approvedBy?: string
  approvedAt?: string | null
  nextReviewAt?: string | null
  ownerName?: string
  linkedModelIds: string[]
  linkedRopaId?: string | null
  /** The risk the register carries when residual risk survives mitigation. */
  linkedRiskId?: string | null
  /** The registered use case this assessment covers. */
  linkedUseCaseId?: string | null
  createdAt?: string
  updatedAt?: string
}

function fromRow(r: Record<string, any>): DpiaRecord {
  return {
    id: r.id,
    reference: r.reference ?? undefined,
    title: r.title ?? '',
    description: r.description ?? undefined,
    processingPurpose: r.processing_purpose ?? undefined,
    necessityJustification: r.necessity_justification ?? undefined,
    dataCategories: Array.isArray(r.data_categories) ? r.data_categories : [],
    dataSubjects: r.data_subjects ?? undefined,
    riskLevel: (r.risk_level ?? 'medium') as RiskLevel,
    identifiedRisks: r.identified_risks ?? undefined,
    mitigationMeasures: r.mitigation_measures ?? undefined,
    residualRiskLevel: (r.residual_risk_level ?? null) as RiskLevel | null,
    consultationRequired: !!r.consultation_required,
    consultationDate: r.consultation_date ?? null,
    status: (r.status ?? 'draft') as DpiaStatus,
    dpoOpinion: r.dpo_opinion ?? undefined,
    dpoReviewedAt: r.dpo_reviewed_at ?? null,
    approvedBy: r.approved_by ?? undefined,
    approvedAt: r.approved_at ?? null,
    nextReviewAt: r.next_review_at ?? null,
    ownerName: r.owner_name ?? undefined,
    linkedModelIds: Array.isArray(r.linked_model_ids) ? r.linked_model_ids : [],
    linkedRopaId: r.linked_ropa_id ?? null,
    linkedRiskId: r.linked_risk_id ?? null,
    linkedUseCaseId: r.linked_use_case_id ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** org_id is omitted — the DB default fills it; the client never picks a tenant. */
function toRow(d: Partial<DpiaRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (d.reference !== undefined) row.reference = d.reference ?? null
  if (d.title !== undefined) row.title = d.title
  if (d.description !== undefined) row.description = d.description ?? null
  if (d.processingPurpose !== undefined) row.processing_purpose = d.processingPurpose ?? null
  if (d.necessityJustification !== undefined) row.necessity_justification = d.necessityJustification ?? null
  if (d.dataCategories !== undefined) row.data_categories = d.dataCategories
  if (d.dataSubjects !== undefined) row.data_subjects = d.dataSubjects ?? null
  if (d.riskLevel !== undefined) row.risk_level = d.riskLevel
  if (d.identifiedRisks !== undefined) row.identified_risks = d.identifiedRisks ?? null
  if (d.mitigationMeasures !== undefined) row.mitigation_measures = d.mitigationMeasures ?? null
  if (d.residualRiskLevel !== undefined) row.residual_risk_level = d.residualRiskLevel || null
  if (d.consultationRequired !== undefined) row.consultation_required = d.consultationRequired
  if (d.consultationDate !== undefined) row.consultation_date = d.consultationDate || null
  if (d.status !== undefined) row.status = d.status
  if (d.dpoOpinion !== undefined) row.dpo_opinion = d.dpoOpinion ?? null
  if (d.dpoReviewedAt !== undefined) row.dpo_reviewed_at = d.dpoReviewedAt || null
  if (d.approvedBy !== undefined) row.approved_by = d.approvedBy ?? null
  if (d.approvedAt !== undefined) row.approved_at = d.approvedAt || null
  if (d.nextReviewAt !== undefined) row.next_review_at = d.nextReviewAt || null
  if (d.ownerName !== undefined) row.owner_name = d.ownerName ?? null
  if (d.linkedModelIds !== undefined) row.linked_model_ids = d.linkedModelIds
  if (d.linkedRopaId !== undefined) row.linked_ropa_id = d.linkedRopaId || null
  if (d.linkedRiskId !== undefined) row.linked_risk_id = d.linkedRiskId || null
  if (d.linkedUseCaseId !== undefined) row.linked_use_case_id = d.linkedUseCaseId || null
  return row
}

export async function fetchDpiaRecords(): Promise<DpiaRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('dpia_assessments').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(fromRow)
}

export async function createDpiaRecord(d: Partial<DpiaRecord>): Promise<DpiaRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase.from('dpia_assessments').insert(toRow(d)).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'privacy', entityType: 'dpia_assessments', entityId: data.id, action: 'create' })
  return fromRow(data)
}

export async function updateDpiaRecord(id: string, patch: Partial<DpiaRecord>): Promise<DpiaRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase
    .from('dpia_assessments')
    .update({ ...toRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'privacy', entityType: 'dpia_assessments', entityId: id, action: 'update' })
  return fromRow(data)
}

export async function softDeleteDpiaRecord(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase
    .from('dpia_assessments')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'privacy', entityType: 'dpia_assessments', entityId: id, action: 'delete' })
}
