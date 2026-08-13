// SPDX-License-Identifier: Apache-2.0
// Risk Classification (EU AI Act tiering) data layer + a correct tiering engine.
// Reads/writes the real, org-scoped public.ai_risk_tiering table. Writes throw;
// org_id filled by the DB default. Interlinks to the model registry via
// system_id / metadata.model_id (ai_models.id).

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export type RiskTier = 'unacceptable' | 'high' | 'limited' | 'minimal'

export interface RiskClassification {
  id: string
  systemId: string
  systemName: string
  riskTier: RiskTier
  riskScore: number | null
  useCase: string
  affectedUsers: string
  fundamentalRightsImpact: string
  classificationBasis: string
  classifier: string
  classifiedAt: string | null
  reviewDueAt: string | null
  status: string               // draft | in_review | approved
  modelId: string | null
  useCaseId: string | null     // interlink -> use_cases.id (stored in metadata)
  annexIII: string[]
  obligations: string[]
  gpai: boolean
  createdAt: string
}

// ── Questionnaire vocabulary (drives the wizard) ──────────────────────────────
// Article 5 — prohibited practices. Any selection ⇒ Unacceptable.
export const PROHIBITED_PRACTICES = [
  'Social scoring by public authorities',
  'Subliminal / manipulative techniques causing harm',
  'Exploiting vulnerabilities of specific groups',
  'Real-time remote biometric identification in public (law enforcement)',
  'Untargeted scraping of facial images',
  'Emotion recognition in workplace / education',
  'Biometric categorisation by sensitive attributes',
]
// Annex III — high-risk categories. Any selection ⇒ High-Risk.
export const ANNEX_III_CATEGORIES = [
  'Biometric identification & categorisation',
  'Critical infrastructure',
  'Education & vocational training',
  'Employment / recruitment',
  'Access to essential services (incl. creditworthiness)',
  'Law enforcement',
  'Migration, asylum & border control',
  'Administration of justice & democratic processes',
]

export const HIGH_RISK_OBLIGATIONS = [
  'Risk management system (Art. 9)',
  'Data governance & quality (Art. 10)',
  'Technical documentation (Art. 11)',
  'Record-keeping / logging (Art. 12)',
  'Transparency to deployers (Art. 13)',
  'Human oversight (Art. 14)',
  'Accuracy, robustness & cybersecurity (Art. 15)',
]

export interface TieringInput {
  prohibitedPractices: string[]
  annexIII: string[]
  affectsFundamentalRights: boolean
  interactsWithHumans: boolean
  generatesSyntheticContent: boolean
  isGPAI: boolean
  discloses: boolean
}

export interface TieringResult { tier: RiskTier; basis: string; obligations: string[]; score: number }

// Correct EU AI Act mapping (replaces the old broken heuristic):
//   prohibited practice → Unacceptable
//   Annex III category or a decision affecting fundamental rights → High
//   interacts with humans / synthetic content / undisclosed GPAI → Limited (Art. 50)
//   otherwise → Minimal
export function deriveEuTier(i: TieringInput): TieringResult {
  if (i.prohibitedPractices.length > 0) {
    return {
      tier: 'unacceptable',
      basis: `Art. 5 prohibited practice: ${i.prohibitedPractices.join('; ')}`,
      obligations: ['Prohibited under Article 5 — must not be placed on the EU market.'],
      score: 1,
    }
  }
  if (i.annexIII.length > 0 || i.affectsFundamentalRights) {
    const basis = i.annexIII.length > 0
      ? `Annex III high-risk: ${i.annexIII.join('; ')}`
      : 'Automated decision materially affecting fundamental rights'
    return { tier: 'high', basis, obligations: HIGH_RISK_OBLIGATIONS, score: 0.8 }
  }
  if (i.interactsWithHumans || i.generatesSyntheticContent || (i.isGPAI && !i.discloses)) {
    const reasons: string[] = []
    if (i.interactsWithHumans) reasons.push('interacts directly with people')
    if (i.generatesSyntheticContent) reasons.push('generates synthetic content')
    if (i.isGPAI && !i.discloses) reasons.push('GPAI without disclosure')
    return {
      tier: 'limited',
      basis: `Art. 50 transparency obligations (${reasons.join(', ')})`,
      obligations: ['Transparency / AI-use disclosure (Art. 50)'],
      score: 0.35,
    }
  }
  return { tier: 'minimal', basis: 'No Annex III category and no transparency trigger', obligations: [], score: 0.1 }
}

const asArr = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : [])

function fromRow(r: Record<string, any>): RiskClassification {
  const meta = (r.metadata ?? {}) as Record<string, any>
  return {
    id: r.id,
    systemId: r.system_id ?? '',
    systemName: r.system_name ?? '',
    riskTier: (r.risk_tier ?? 'limited') as RiskTier,
    riskScore: r.risk_score != null ? Number(r.risk_score) : null,
    useCase: r.use_case ?? '',
    affectedUsers: r.affected_users ?? '',
    fundamentalRightsImpact: r.fundamental_rights_impact ?? '',
    classificationBasis: r.classification_basis ?? '',
    classifier: r.classifier ?? '',
    classifiedAt: r.classified_at ?? null,
    reviewDueAt: r.review_due_at ?? null,
    status: r.status ?? 'draft',
    modelId: meta.model_id || r.system_id || null,   // '' -> null
    useCaseId: meta.use_case_id ?? null,
    annexIII: asArr<string>(meta.annexIII),
    obligations: asArr<string>(meta.obligations),
    gpai: !!meta.gpai,
    createdAt: r.created_at,
  }
}

function toRow(c: Partial<RiskClassification>): Record<string, any> {
  const row: Record<string, any> = {}
  if (c.id !== undefined) row.id = c.id
  if (c.systemId !== undefined) row.system_id = c.systemId || null   // normalize '' -> null
  if (c.systemName !== undefined) row.system_name = c.systemName
  if (c.riskTier !== undefined) row.risk_tier = c.riskTier
  if (c.riskScore !== undefined) row.risk_score = c.riskScore
  if (c.useCase !== undefined) row.use_case = c.useCase
  if (c.affectedUsers !== undefined) row.affected_users = c.affectedUsers
  if (c.fundamentalRightsImpact !== undefined) row.fundamental_rights_impact = c.fundamentalRightsImpact
  if (c.classificationBasis !== undefined) row.classification_basis = c.classificationBasis
  if (c.classifier !== undefined) row.classifier = c.classifier
  if (c.classifiedAt !== undefined) row.classified_at = c.classifiedAt
  if (c.reviewDueAt !== undefined) row.review_due_at = c.reviewDueAt
  if (c.status !== undefined) row.status = c.status
  // Interlink + questionnaire detail live in metadata.
  if (c.modelId !== undefined || c.useCaseId !== undefined || c.annexIII !== undefined || c.obligations !== undefined || c.gpai !== undefined) {
    row.metadata = {
      ...(c.modelId !== undefined ? { model_id: c.modelId || null } : {}),
      ...(c.useCaseId !== undefined ? { use_case_id: c.useCaseId || null } : {}),
      ...(c.annexIII !== undefined ? { annexIII: c.annexIII } : {}),
      ...(c.obligations !== undefined ? { obligations: c.obligations } : {}),
      ...(c.gpai !== undefined ? { gpai: c.gpai } : {}),
    }
  }
  row.updated_at = new Date().toISOString()
  return row
}

export async function fetchRiskClassifications(): Promise<RiskClassification[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('ai_risk_tiering').select('*').order('classified_at', { ascending: false, nullsFirst: false })
  if (error) { console.warn('[riskTiering] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(fromRow)
}

export async function upsertRiskClassification(c: Partial<RiskClassification>): Promise<RiskClassification> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save classification.')
  const { data, error } = await supabase.from('ai_risk_tiering').upsert(toRow(c)).select().single()
  if (error) { console.warn('[riskTiering] upsert:', error.message); throw new Error(error.message) }
  return fromRow(data)
}

export async function deleteRiskClassification(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete classification.')
  const { error } = await supabase.from('ai_risk_tiering').delete().eq('id', id)
  if (error) { console.warn('[riskTiering] delete:', error.message); throw new Error(error.message) }
}
