// SPDX-License-Identifier: Apache-2.0
// Impact Assessments (AIIA) data layer — reads/writes the real, org-scoped
// public.ai_impact_assessments table. Mirrors modelService: writes throw on
// failure (never swallow), org_id/tenant_id filled by the DB default so the
// browser never sets it. Rows interlink to the model registry (model_id ->
// ai_models.id) and to the Use Case Registry (use_case_id -> use_cases.id).

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type AiiaFinding = { title: string; severity?: string; status?: string }
export type AiiaMitigation = { title: string; status?: string }

export interface ImpactAssessment {
  id: string
  assessmentId: string
  title: string
  type: string                 // assessment_type (FRIA / DPIA / AIIA …)
  modelId: string | null
  useCaseId: string | null
  riskLevel: string            // low | medium | high | critical
  status: string               // draft | in_review | approved | rejected
  progressPct: number
  assessor: string
  reviewer: string
  summary: string
  affectedEntities: string[]
  ragStatus: string            // green | amber | red
  findings: AiiaFinding[]
  mitigations: AiiaMitigation[]
  approvedAt: string | null
  nextReview: string | null
  createdAt: string
  updatedAt: string
}

const asArr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

function fromRow(r: Record<string, any>): ImpactAssessment {
  return {
    id: r.id,
    assessmentId: r.assessment_id ?? r.id,
    title: r.title ?? '',
    type: r.assessment_type ?? 'AIIA',
    modelId: r.model_id ?? null,
    useCaseId: r.use_case_id ?? null,
    riskLevel: r.risk_level ?? 'medium',
    status: r.status ?? 'draft',
    progressPct: Number(r.progress_pct ?? 0),
    assessor: r.assessor_id ?? '',
    reviewer: r.reviewer_id ?? '',
    summary: r.summary ?? '',
    affectedEntities: asArr<string>(r.affected_entities),
    ragStatus: r.rag_status ?? 'amber',
    findings: asArr<AiiaFinding>(r.findings),
    mitigations: asArr<AiiaMitigation>(r.mitigations),
    approvedAt: r.approved_at ?? null,
    nextReview: r.next_review ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

// Only send columns the caller set. tenant_id is intentionally omitted — the DB
// default (current_user_org_id()) fills it and RLS enforces it.
function toRow(a: Partial<ImpactAssessment>): Record<string, any> {
  const row: Record<string, any> = {}
  if (a.id !== undefined) row.id = a.id
  if (a.assessmentId !== undefined) row.assessment_id = a.assessmentId
  if (a.title !== undefined) row.title = a.title
  if (a.type !== undefined) row.assessment_type = a.type
  if (a.modelId !== undefined) row.model_id = a.modelId
  if (a.useCaseId !== undefined) row.use_case_id = a.useCaseId
  if (a.riskLevel !== undefined) row.risk_level = a.riskLevel
  if (a.status !== undefined) row.status = a.status
  if (a.progressPct !== undefined) row.progress_pct = a.progressPct
  if (a.assessor !== undefined) row.assessor_id = a.assessor
  if (a.reviewer !== undefined) row.reviewer_id = a.reviewer
  if (a.summary !== undefined) row.summary = a.summary
  if (a.affectedEntities !== undefined) row.affected_entities = a.affectedEntities
  if (a.ragStatus !== undefined) row.rag_status = a.ragStatus
  if (a.findings !== undefined) row.findings = a.findings
  if (a.mitigations !== undefined) row.mitigations = a.mitigations
  if (a.approvedAt !== undefined) row.approved_at = a.approvedAt
  if (a.nextReview !== undefined) row.next_review = a.nextReview
  row.updated_at = new Date().toISOString()
  return row
}

export async function fetchImpactAssessments(): Promise<ImpactAssessment[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('ai_impact_assessments').select('*').order('created_at', { ascending: false })
  if (error) { console.warn('[impactAssessment] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(fromRow)
}

export async function upsertImpactAssessment(a: Partial<ImpactAssessment>): Promise<ImpactAssessment> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save assessment.')
  const { data, error } = await supabase
    .from('ai_impact_assessments').upsert(toRow(a)).select().single()
  if (error) { console.warn('[impactAssessment] upsert:', error.message); throw new Error(error.message) }
  return fromRow(data)
}

export async function deleteImpactAssessment(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete assessment.')
  const { error } = await supabase.from('ai_impact_assessments').delete().eq('id', id)
  if (error) { console.warn('[impactAssessment] delete:', error.message); throw new Error(error.message) }
}
