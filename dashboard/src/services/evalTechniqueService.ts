// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Eval techniques (`eval_techniques`) — the catalogue of evaluation methods the
// org runs against its models, each with a cadence, an owner and the models it
// applies to. Org-scoped via RLS with org_id defaulted DB-side; writes throw so
// the UI can never report a false success.
//
// Replaces the generic `evaltechniques_table (id, doc jsonb)` demo table the
// page previously read, whose rows were seeded from a hardcoded array.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

export const TECHNIQUE_CATEGORIES = [
  'performance', 'fairness', 'robustness', 'security', 'quality',
  'explainability', 'privacy', 'other',
] as const
export type TechniqueCategory = (typeof TECHNIQUE_CATEGORIES)[number]

export const TECHNIQUE_CADENCES = ['continuous', 'monthly', 'quarterly', 'semiannual', 'annual', 'ad_hoc'] as const
export type TechniqueCadence = (typeof TECHNIQUE_CADENCES)[number]

export const TECHNIQUE_STATUSES = ['planned', 'in_progress', 'completed', 'blocked'] as const
export type TechniqueStatus = (typeof TECHNIQUE_STATUSES)[number]

export interface EvalTechniqueRecord {
  id: string
  name: string
  description?: string
  category: TechniqueCategory
  methodology?: string
  scoringMethod?: string
  applicableTypes: string[]
  cadence: TechniqueCadence
  status: TechniqueStatus
  iconKey: string
  lastRunAt?: string | null
  nextDueAt?: string | null
  owner?: string
  linkedModelIds: string[]
  referenceUrl?: string
  createdAt?: string
  updatedAt?: string
}

function fromRow(r: Record<string, any>): EvalTechniqueRecord {
  return {
    id: r.id,
    name: r.name ?? '',
    description: r.description ?? undefined,
    category: (r.category ?? 'other') as TechniqueCategory,
    methodology: r.methodology ?? undefined,
    scoringMethod: r.scoring_method ?? undefined,
    applicableTypes: Array.isArray(r.applicable_types) ? r.applicable_types : [],
    cadence: (r.cadence ?? 'quarterly') as TechniqueCadence,
    status: (r.status ?? 'planned') as TechniqueStatus,
    iconKey: r.icon_key ?? 'flask',
    lastRunAt: r.last_run_at ?? null,
    nextDueAt: r.next_due_at ?? null,
    owner: r.owner ?? undefined,
    linkedModelIds: Array.isArray(r.linked_model_ids) ? r.linked_model_ids : [],
    referenceUrl: r.reference_url ?? undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

function toRow(t: Partial<EvalTechniqueRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  if (t.name !== undefined) row.name = t.name
  if (t.description !== undefined) row.description = t.description ?? null
  if (t.category !== undefined) row.category = t.category
  if (t.methodology !== undefined) row.methodology = t.methodology ?? null
  if (t.scoringMethod !== undefined) row.scoring_method = t.scoringMethod ?? null
  if (t.applicableTypes !== undefined) row.applicable_types = t.applicableTypes
  if (t.cadence !== undefined) row.cadence = t.cadence
  if (t.status !== undefined) row.status = t.status
  if (t.iconKey !== undefined) row.icon_key = t.iconKey
  if (t.lastRunAt !== undefined) row.last_run_at = t.lastRunAt || null
  if (t.nextDueAt !== undefined) row.next_due_at = t.nextDueAt || null
  if (t.owner !== undefined) row.owner = t.owner ?? null
  if (t.linkedModelIds !== undefined) row.linked_model_ids = t.linkedModelIds
  if (t.referenceUrl !== undefined) row.reference_url = t.referenceUrl ?? null
  return row
}

export async function fetchEvalTechniques(): Promise<EvalTechniqueRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('eval_techniques').select('*').eq('is_deleted', false).order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map(fromRow)
}

export async function createEvalTechnique(t: Partial<EvalTechniqueRecord>): Promise<EvalTechniqueRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase.from('eval_techniques').insert(toRow(t)).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'evals', entityType: 'eval_techniques', entityId: data.id, action: 'create' })
  return fromRow(data)
}

export async function updateEvalTechnique(id: string, patch: Partial<EvalTechniqueRecord>): Promise<EvalTechniqueRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save.')
  const { data, error } = await supabase
    .from('eval_techniques')
    .update({ ...toRow(patch), updated_at: new Date().toISOString() })
    .eq('id', id).select().single()
  if (error) throw new Error(error.message)
  void logAction({ module: 'evals', entityType: 'eval_techniques', entityId: id, action: 'update' })
  return fromRow(data)
}

export async function softDeleteEvalTechnique(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete.')
  const { error } = await supabase
    .from('eval_techniques')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({ module: 'evals', entityType: 'eval_techniques', entityId: id, action: 'delete' })
}
