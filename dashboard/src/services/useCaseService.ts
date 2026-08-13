// SPDX-License-Identifier: Apache-2.0
// Use Case Registry data layer — reads/writes the real, org-scoped
// public.use_cases table. Writes throw on failure; tenant_id filled by the DB
// default. linked_model_ids interlinks to the model registry (ai_models.id).

import { supabase, isSupabaseConfigured } from '../lib/supabase'

// Canonical risk-class vocabulary shared by Create, list badges and filters, so
// a record created in one place is found by the filter in another.
export type UseCaseRiskClass = 'high' | 'limited' | 'minimal' | 'unacceptable'
export const RISK_CLASS_OPTIONS: { value: UseCaseRiskClass; label: string }[] = [
  { value: 'high', label: 'High-Risk' },
  { value: 'limited', label: 'Limited' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'unacceptable', label: 'Unacceptable' },
]

export interface UseCase {
  id: string
  title: string
  owner: string
  status: string               // draft | under_review | active | approved | retired
  approvalWorkflow: string
  riskClass: UseCaseRiskClass
  highRiskRole: string | null
  teamMembers: string[]
  startDate: string | null
  geography: string | null
  regulations: string[]
  goal: string | null
  industry: string | null
  description: string | null
  complianceScore: number
  linkedModelIds: string[]
  createdAt: string
  updatedAt: string
}

const asArr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

function fromRow(r: Record<string, any>): UseCase {
  return {
    id: r.id,
    title: r.title ?? '',
    owner: r.owner ?? '',
    status: r.status ?? 'draft',
    approvalWorkflow: r.approval_workflow ?? 'standard',
    riskClass: (r.ai_risk_classification ?? 'limited') as UseCaseRiskClass,
    highRiskRole: r.high_risk_role ?? null,
    teamMembers: asArr<string>(r.team_members),
    startDate: r.start_date ?? null,
    geography: r.geography ?? null,
    regulations: asArr<string>(r.applicable_regulations),
    goal: r.goal ?? null,
    industry: r.target_industry ?? null,
    description: r.description ?? null,
    complianceScore: Number(r.compliance_score ?? 0),
    linkedModelIds: asArr<string>(r.linked_model_ids),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toRow(u: Partial<UseCase>): Record<string, any> {
  const row: Record<string, any> = {}
  if (u.id !== undefined) row.id = u.id
  if (u.title !== undefined) row.title = u.title
  if (u.owner !== undefined) row.owner = u.owner
  if (u.status !== undefined) row.status = u.status
  if (u.approvalWorkflow !== undefined) row.approval_workflow = u.approvalWorkflow
  if (u.riskClass !== undefined) row.ai_risk_classification = u.riskClass
  if (u.highRiskRole !== undefined) row.high_risk_role = u.highRiskRole
  if (u.teamMembers !== undefined) row.team_members = u.teamMembers
  if (u.startDate !== undefined) row.start_date = u.startDate
  if (u.geography !== undefined) row.geography = u.geography
  if (u.regulations !== undefined) row.applicable_regulations = u.regulations
  if (u.goal !== undefined) row.goal = u.goal
  if (u.industry !== undefined) row.target_industry = u.industry
  if (u.description !== undefined) row.description = u.description
  if (u.complianceScore !== undefined) row.compliance_score = u.complianceScore
  if (u.linkedModelIds !== undefined) row.linked_model_ids = u.linkedModelIds
  row.updated_at = new Date().toISOString()
  return row
}

export async function fetchUseCases(): Promise<UseCase[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('use_cases').select('*').eq('is_deleted', false).order('created_at', { ascending: false })
  if (error) { console.warn('[useCase] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(fromRow)
}

export async function fetchUseCase(id: string): Promise<UseCase | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  const { data, error } = await supabase
    .from('use_cases').select('*').eq('id', id).eq('is_deleted', false).maybeSingle()
  if (error) { console.warn('[useCase] fetchOne:', error.message); throw new Error(error.message) }
  return data ? fromRow(data) : null
}

// Insert (no id → DB generates one). Returns the persisted row incl. its real id
// so the caller can navigate straight to /use-cases/<id>.
export async function createUseCase(u: Partial<UseCase>): Promise<UseCase> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot create use case.')
  const row = toRow(u); delete row.id
  const { data, error } = await supabase.from('use_cases').insert(row).select().single()
  if (error) { console.warn('[useCase] create:', error.message); throw new Error(error.message) }
  return fromRow(data)
}

export async function updateUseCase(id: string, patch: Partial<UseCase>): Promise<UseCase> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot update use case.')
  const { data, error } = await supabase.from('use_cases').update(toRow(patch)).eq('id', id).select().single()
  if (error) { console.warn('[useCase] update:', error.message); throw new Error(error.message) }
  return fromRow(data)
}

export async function softDeleteUseCase(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete use case.')
  const { error } = await supabase.from('use_cases').update({ is_deleted: true }).eq('id', id)
  if (error) { console.warn('[useCase] delete:', error.message); throw new Error(error.message) }
}
