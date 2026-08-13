// SPDX-License-Identifier: Apache-2.0
// Bias Audits page crud — consolidated onto the platform's ONE bias-audit
// table, public.bias_audits (typed columns + results jsonb), the same table
// Model Detail's Bias History tab reads. The page's rich BiasAudit entity is
// stored in results.doc; typed columns (model_id, dataset_id, framework,
// overall_score, status) are kept in sync so both surfaces stay consistent.
// Contract: writes throw; org via RLS (tenant_id = caller's org, DB-side).

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'
import type { EvalsCrud } from './evalsCrud'
import type { BiasAudit } from '../types/evals'

const ORG_HEADERED = 'bias_audits'

function fromRow(r: Record<string, any>): BiasAudit {
  const doc = r.results?.doc as BiasAudit | undefined
  if (doc) return { ...doc, id: r.id, modelId: r.model_id ?? doc.modelId }
  // Row created outside this page (e.g. Model Detail seeds): synthesize the
  // page shape from the typed columns so it still lists and opens.
  const res = (r.results ?? {}) as Record<string, any>
  const score = Number(r.overall_score ?? 0)
  return {
    id: r.id,
    auditId: r.id,
    modelId: r.model_id ?? '',
    modelName: res.modelName ?? '',
    datasetId: r.dataset_id ?? '',
    framework: r.framework ?? '',
    auditor: res.auditor ?? '',
    state: (r.status ?? 'Completed').toLowerCase() === 'completed' ? 'Approved' : 'InReview',
    fairnessScore: score,
    result: score >= Number(r.threshold ?? 0.8) ? 'pass' : 'fail',
    riskTier: score >= 0.8 ? 'medium' : 'high',
    protectedAttributes: Array.isArray(res.protectedAttributes) ? res.protectedAttributes : [],
    intersections: [],
    counterfactual: { flipRate: 0, cases: [] },
    snapshots: [],
    regMappings: [],
    auditTrail: [],
  } as unknown as BiasAudit
}

function toRow(rec: BiasAudit): Record<string, any> {
  return {
    id: rec.id,
    model_id: rec.modelId || null,
    dataset_id: rec.datasetId || null,
    framework: rec.framework || null,
    overall_score: rec.fairnessScore ?? null,
    threshold: 0.8,
    status: rec.state === 'Approved' || rec.state === 'CondApproved' ? 'Completed' : 'In Progress',
    results: { doc: rec, auditor: rec.auditor, protectedAttributes: rec.protectedAttributes },
    is_deleted: false,
    updated_at: new Date().toISOString(),
  }
}

export const biasAuditsUnifiedCrud: EvalsCrud<BiasAudit> = {
  table: ORG_HEADERED,
  module: 'bias-audits',

  async list(): Promise<BiasAudit[]> {
    if (!isSupabaseConfigured() || !supabase) return []
    const { data, error } = await supabase
      .from(ORG_HEADERED).select('*').eq('is_deleted', false)
      .order('created_at', { ascending: false })
    if (error) { console.warn('[bias-audits] list:', error.message); throw new Error(error.message) }
    return (data ?? []).map(fromRow)
  },

  async get(id: string): Promise<BiasAudit | null> {
    if (!isSupabaseConfigured() || !supabase) return null
    const { data, error } = await supabase
      .from(ORG_HEADERED).select('*').eq('id', id).eq('is_deleted', false).maybeSingle()
    if (error) { console.warn('[bias-audits] get:', error.message); throw new Error(error.message) }
    return data ? fromRow(data) : null
  },

  async upsert(rec: BiasAudit): Promise<BiasAudit> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save audit.')
    const { data, error } = await supabase
      .from(ORG_HEADERED).upsert(toRow(rec)).select().single()
    if (error) { console.warn('[bias-audits] upsert:', error.message); throw new Error(error.message) }
    void logAction({ module: 'bias-audits', entityType: ORG_HEADERED, entityId: rec.id, action: 'upsert' })
    return fromRow(data)
  },

  async softDelete(id: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete audit.')
    const { error } = await supabase
      .from(ORG_HEADERED).update({ is_deleted: true }).eq('id', id)
    if (error) { console.warn('[bias-audits] delete:', error.message); throw new Error(error.message) }
    void logAction({ module: 'bias-audits', entityType: ORG_HEADERED, entityId: id, action: 'delete' })
  },
}
