// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// ESG disclosures (`esg_reports`) — AI-specific sustainability reporting with
// the evidence chain (which carbon records and energy readings a disclosure is
// built from), the assurance record, and a governed approval transition.
//
// THE WORST DEFECT THIS REWRITE CLOSES: the service shipped three hardcoded
// **Published** disclosures with named human authors, scores and factual
// claims ("Reduced average LLM inference power usage by 18%"), and served them
// to ANY tenant whose table was empty or whose query errored. A new customer
// saw fabricated published sustainability disclosures attributed to people who
// do not work there. That seed array is DELETED. An empty tenant now gets [],
// and the page shows its honest empty state.
//
// Writes THROW. Publish/approve is a governed state transition that records
// the approver identity and time and writes to the audit log — it is not a
// local `setState` with a success toast, which is what it used to be.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

/**
 * Canonical status vocabulary — lowercase, one spelling. Seeds previously
 * carried 'published' / 'Published' / 'DRAFT' simultaneously, so the KPI strip
 * filtered on a spelling half the data did not use and published reports were
 * badged as drafts. The migration lowercases stored values; `normalizeStatus`
 * folds the remaining spelling variants on read.
 */
export const ESG_STATUSES = ['draft', 'in_review', 'approved', 'published'] as const
export type EsgStatus = (typeof ESG_STATUSES)[number]

export const ESG_STATUS_LABEL: Record<EsgStatus, string> = {
  draft: 'Draft',
  in_review: 'In review',
  approved: 'Approved',
  published: 'Published',
}

export function normalizeStatus(v: unknown): EsgStatus {
  const s = String(v ?? '').trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (s === 'under_review' || s === 'review' || s === 'in_review') return 'in_review'
  if (s === 'published') return 'published'
  if (s === 'approved') return 'approved'
  return 'draft'
}

/** none | limited | reasonable — ISAE 3000 / ISAE 3410 assurance levels. */
export const ASSURANCE_STATUSES = ['none', 'limited', 'reasonable'] as const
export type AssuranceStatus = (typeof ASSURANCE_STATUSES)[number]

export interface EsgReport {
  id: string
  title: string
  period: string
  periodStart: string | null
  periodEnd: string | null
  framework: string | null
  frameworkVersion: string | null
  status: EsgStatus
  author: string | null
  /** Directory uuid of the lead author, kept in metadata (no author_id column). */
  authorUserId: string | null
  environmentalScore: number | null
  socialScore: number | null
  governanceScore: number | null
  /** Self-assessed mean of the three dimensions — NOT a framework score. */
  overallScore: number | null
  highlights: string[]
  /** Real seeded payload: gpu_hours, kwh, co2_kg, renewable_pct, pue, … */
  aiMetrics: Record<string, unknown> | null
  assuranceStatus: AssuranceStatus | null
  assuranceProvider: string | null
  assuranceDate: string | null
  approver: string | null
  approvedBy: string | null
  approvedAt: string | null
  reportingBoundary: string | null
  consolidationBasis: string | null
  isRestatement: boolean
  restatementReason: string | null
  materialityTopics: string[]
  scope1Tco2e: number | null
  scope2Tco2e: number | null
  scope3Tco2e: number | null
  /** Evidence chain — the records this disclosure reports on. */
  carbonRecordIds: string[]
  energyMetricIds: string[]
  modelIds: string[]
  documentId: string | null
  methodology: string | null
  publishedAt: string | null
  createdAt?: string
  updatedAt?: string
}

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)

const txt = (v: unknown): string | null =>
  typeof v === 'string' && v.trim().length > 0 ? v : null

const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map(String) : [])

/** The seeded `ai_metrics` payload is an object; tolerate a legacy array too. */
function toMetricsObject(v: unknown): Record<string, unknown> | null {
  if (!v) return null
  if (Array.isArray(v)) {
    if (v.length === 0) return null
    const out: Record<string, unknown> = {}
    for (const entry of v as Record<string, unknown>[]) {
      const key = typeof entry?.metric === 'string' ? entry.metric : null
      if (key) out[key] = entry.value
    }
    return Object.keys(out).length ? out : null
  }
  if (typeof v === 'object') {
    const o = v as Record<string, unknown>
    return Object.keys(o).length ? o : null
  }
  return null
}

export function fromRow(r: Record<string, any>): EsgReport {
  const metadata = (r.metadata ?? {}) as Record<string, any>
  return {
    id: r.id,
    // Never fall back to a uuid — an id is not a title.
    title: txt(r.title) ?? 'Untitled ESG report',
    period: txt(r.period) ?? '',
    periodStart: r.period_start ?? null,
    periodEnd: r.period_end ?? null,
    framework: txt(r.framework),
    frameworkVersion: txt(r.framework_version),
    status: normalizeStatus(r.status),
    author: txt(r.author),
    authorUserId: txt(metadata.author_user_id),
    environmentalScore: num(r.environmental_score),
    socialScore: num(r.social_score),
    governanceScore: num(r.governance_score),
    overallScore: num(r.overall_score),
    highlights: arr(r.highlights),
    // The page previously read `aiSpecificMetrics` / `ai_specific_metrics`,
    // neither of which exists — the whole AI-Specific Metrics panel was dead
    // code hiding this real column.
    aiMetrics: toMetricsObject(r.ai_metrics),
    assuranceStatus: (txt(r.assurance_status) as AssuranceStatus | null),
    assuranceProvider: txt(r.assurance_provider) ?? txt(metadata.assurance_provider),
    assuranceDate: r.assurance_date ?? null,
    approver: txt(r.approver),
    approvedBy: r.approved_by ?? null,
    approvedAt: r.approved_at ?? null,
    reportingBoundary: txt(r.reporting_boundary),
    consolidationBasis: txt(r.consolidation_basis),
    isRestatement: r.is_restatement === true,
    restatementReason: txt(r.restatement_reason),
    materialityTopics: arr(r.materiality_topics),
    scope1Tco2e: num(r.scope1_tco2e),
    scope2Tco2e: num(r.scope2_tco2e),
    scope3Tco2e: num(r.scope3_tco2e),
    carbonRecordIds: arr(r.carbon_record_ids),
    energyMetricIds: arr(r.energy_metric_ids),
    modelIds: arr(r.model_ids),
    documentId: r.document_id ?? null,
    methodology: txt(r.methodology),
    // The page read `publishedDate` / `published_date`; the column is
    // `published_at`, so the drawer always said "TBD".
    publishedAt: r.published_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** camelCase → snake_case; only keys the caller set are written. */
function toRow(e: Partial<EsgReport>): Record<string, any> {
  const row: Record<string, any> = {}
  if (e.title !== undefined) row.title = e.title
  if (e.period !== undefined) row.period = e.period
  if (e.periodStart !== undefined) row.period_start = e.periodStart || null
  if (e.periodEnd !== undefined) row.period_end = e.periodEnd || null
  if (e.framework !== undefined) row.framework = e.framework || null
  if (e.frameworkVersion !== undefined) row.framework_version = e.frameworkVersion || null
  if (e.status !== undefined) row.status = normalizeStatus(e.status)
  if (e.author !== undefined) row.author = e.author || null
  if (e.environmentalScore !== undefined) row.environmental_score = e.environmentalScore
  if (e.socialScore !== undefined) row.social_score = e.socialScore
  if (e.governanceScore !== undefined) row.governance_score = e.governanceScore
  if (e.overallScore !== undefined) row.overall_score = e.overallScore
  if (e.highlights !== undefined) row.highlights = e.highlights
  if (e.aiMetrics !== undefined) row.ai_metrics = e.aiMetrics ?? {}
  if (e.assuranceStatus !== undefined) row.assurance_status = e.assuranceStatus || null
  if (e.assuranceProvider !== undefined) row.assurance_provider = e.assuranceProvider || null
  if (e.assuranceDate !== undefined) row.assurance_date = e.assuranceDate || null
  if (e.approver !== undefined) row.approver = e.approver || null
  if (e.approvedBy !== undefined) row.approved_by = e.approvedBy || null
  if (e.approvedAt !== undefined) row.approved_at = e.approvedAt || null
  if (e.reportingBoundary !== undefined) row.reporting_boundary = e.reportingBoundary || null
  if (e.consolidationBasis !== undefined) row.consolidation_basis = e.consolidationBasis || null
  if (e.isRestatement !== undefined) row.is_restatement = e.isRestatement
  if (e.restatementReason !== undefined) row.restatement_reason = e.restatementReason || null
  if (e.materialityTopics !== undefined) row.materiality_topics = e.materialityTopics
  if (e.scope1Tco2e !== undefined) row.scope1_tco2e = e.scope1Tco2e
  if (e.scope2Tco2e !== undefined) row.scope2_tco2e = e.scope2Tco2e
  if (e.scope3Tco2e !== undefined) row.scope3_tco2e = e.scope3Tco2e
  if (e.carbonRecordIds !== undefined) row.carbon_record_ids = e.carbonRecordIds
  if (e.energyMetricIds !== undefined) row.energy_metric_ids = e.energyMetricIds
  if (e.modelIds !== undefined) row.model_ids = e.modelIds
  if (e.documentId !== undefined) row.document_id = e.documentId || null
  if (e.methodology !== undefined) row.methodology = e.methodology || null
  if (e.publishedAt !== undefined) row.published_at = e.publishedAt || null
  // `metadata` is written by upsertEsgReport, which merges rather than
  // replaces — seeded metadata (e.g. assurance_provider) must not be lost.
  return row
}

export async function fetchEsgReports(filters: { status?: EsgStatus } = {}): Promise<EsgReport[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('esg_reports').select('*').order('created_at', { ascending: false })
  if (filters.status) q = q.eq('status', filters.status)
  const { data, error } = await q
  // No seed fallback: an error is an error and an empty tenant is empty.
  if (error) { console.warn('[esgService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(fromRow)
}

export async function upsertEsgReport(record: Partial<EsgReport>): Promise<EsgReport> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — cannot save ESG report.')
  }
  const isNew = !record.id
  const row = toRow(record)
  if (record.id) row.id = record.id
  // There is no author_id column, so the directory uuid of the lead author
  // lives in metadata — merged onto whatever is already there so an update
  // never drops keys it did not author.
  if (record.authorUserId !== undefined) {
    let base: Record<string, any> = {}
    if (record.id) {
      const { data: existing } = await supabase.from('esg_reports').select('metadata').eq('id', record.id).single()
      base = (existing?.metadata ?? {}) as Record<string, any>
    }
    row.metadata = { ...base, author_user_id: record.authorUserId || null }
  }
  const { data, error } = await supabase.from('esg_reports').upsert(row).select().single()
  if (error) { console.warn('[esgService] upsert:', error.message); throw new Error(error.message) }
  const saved = fromRow(data)
  await logAction({
    module: 'esg-reports',
    entityType: 'esg_report',
    entityId: saved.id,
    entityName: saved.title,
    action: isNew ? 'create' : 'update',
    newValues: row,
  })
  return saved
}

export async function deleteEsgReport(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — cannot delete ESG report.')
  }
  const { error } = await supabase.from('esg_reports').delete().eq('id', id)
  if (error) { console.warn('[esgService] delete:', error.message); throw new Error(error.message) }
  await logAction({ module: 'esg-reports', entityType: 'esg_report', entityId: id, action: 'delete' })
}

/** Signed-in identity for an approval transition — never a hardcoded name. */
async function currentActor(): Promise<{ id: string | null; name: string | null }> {
  if (!supabase) return { id: null, name: null }
  const { data } = await supabase.auth.getUser()
  const u = data?.user
  return {
    id: u?.id ?? null,
    name: (u?.user_metadata as any)?.full_name ?? u?.email ?? null,
  }
}

/**
 * Governed status transition. `published` and `approved` stamp the approver
 * identity and time from the SIGNED-IN user (EU AI Act Art. 14 human
 * oversight, Art. 12 traceability); publishing also stamps published_at.
 * Throws on failure — the drawer stays open and shows the real error.
 */
export async function transitionEsgReport(
  id: string,
  to: EsgStatus,
  previous?: EsgStatus,
): Promise<EsgReport> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — cannot change report status.')
  }
  const patch: Record<string, any> = { status: to }
  if (to === 'approved' || to === 'published') {
    const actor = await currentActor()
    patch.approved_by = actor.id
    patch.approver = actor.name
    patch.approved_at = new Date().toISOString()
  }
  if (to === 'published') patch.published_at = new Date().toISOString()

  const { data, error } = await supabase.from('esg_reports').update(patch).eq('id', id).select().single()
  if (error) { console.warn('[esgService] transition:', error.message); throw new Error(error.message) }
  const saved = fromRow(data)
  await logAction({
    module: 'esg-reports',
    entityType: 'esg_report',
    entityId: saved.id,
    entityName: saved.title,
    action: to === 'published' ? 'publish' : to === 'in_review' ? 'submit_for_review' : 'approve',
    oldValues: previous ? { status: previous } : undefined,
    newValues: patch,
  })
  return saved
}
