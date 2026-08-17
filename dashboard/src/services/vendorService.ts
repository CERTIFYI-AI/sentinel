// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// vendorService — the real, org-scoped `public.vendors` table.
//
// Schema of record: supabase/migrations/20260418000002_core_grc_tables.sql
// (base table) + 20260822000001_tprm_supply_esg_foundation.sql (org_id DB
// default, the TPRM field model, and risk_tier_label).
//
// Two things this service is deliberate about:
//
//   1. `risk_tier` is INTEGER on the table (seeded 1/2/3). The previous
//      service wrote text into it, which failed with 22P02 and made every
//      Tier-1 vendor render as "Tier 2". We read and write `risk_tier_label`
//      (a constrained text vocabulary) and leave the legacy integer alone.
//   2. org_id is filled by the DB default `current_user_org_id()` — never by
//      the client.
//
// Every write throws on failure so the UI shows a real error instead of a
// false success (CLAUDE.md, First principle #4).

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

export type VendorRiskTier = 'critical' | 'high' | 'medium' | 'low'
export type VendorCriticality = 'critical' | 'high' | 'moderate' | 'low'
export type VendorDpaStatus = 'signed' | 'pending' | 'not_signed' | 'not_required'

export interface VendorRecord {
  id: string
  name: string
  category?: string | null
  description?: string | null
  status?: string | null
  website?: string | null
  contactEmail?: string | null

  /** Constrained text tier — the canonical risk representation. */
  riskTierLabel?: VendorRiskTier | null
  /** Legacy INTEGER column, read-only here. */
  riskTierNumber?: number | null
  criticality?: VendorCriticality | null
  inherentRisk?: string | null
  residualRisk?: string | null
  /** 0–100 vendor score. NULL when never scored — renders as — , never 0. */
  score?: number | null
  riskScore?: number | null
  complianceScore?: number | null

  services?: string | null
  aiUse?: string | null

  // Data protection
  dpaStatus?: VendorDpaStatus | null
  dpaSignedAt?: string | null
  dpaExpiresAt?: string | null
  dataClassification?: string | null
  dataAccessLevel?: string | null
  dataRegions: string[]
  transferMechanism?: string | null

  // Assurance
  soc2Certified?: boolean | null
  soc2ExpiresAt?: string | null
  isoCertified?: boolean | null
  isoExpiresAt?: string | null
  lastPentestAt?: string | null

  // Incidents / supply chain
  breachHistoryCount?: number | null
  lastBreachSummary?: string | null
  lastBreachAt?: string | null
  slaBreachFlag?: boolean | null
  subprocessorCount?: number | null
  fourthPartyExposure?: string | null
  concentrationRisk?: number | null
  riskFlag?: boolean | null

  // Lifecycle
  exitPlanStatus?: string | null
  exitPlanNotes?: string | null
  reassessmentCadenceMonths?: number | null
  reassessmentDueAt?: string | null
  lastAssessedAt?: string | null
  lastAssessment?: string | null

  // Commercial
  businessOwner?: string | null
  vendorManager?: string | null
  contractStart?: string | null
  contractExpiry?: string | null
  renewalNoticeDays?: number | null
  annualSpend?: number | null
  spendCurrency?: string | null
  insuranceCoverage?: string | null

  /** ai_models.id uuids this vendor supplies (one id-space). */
  linkedModels: string[]

  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

// ── mapping ────────────────────────────────────────────────────────────────

function numOrNull(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** vendors.linked_models is JSONB on the live table and text[] on some
 *  replays — normalise both, and drop anything that is not a string id. */
function toIdArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string' && x.length > 0)
  if (typeof v === 'string' && v.trim().startsWith('[')) {
    try { return toIdArray(JSON.parse(v)) } catch { return [] }
  }
  return []
}

export function fromRow(r: Record<string, any>): VendorRecord {
  return {
    id: r.id,
    name: r.name ?? r.vendor_name ?? '',
    category: r.category ?? null,
    description: r.description ?? r.what_does_vendor_provide ?? null,
    status: r.status ?? null,
    website: r.website ?? null,
    contactEmail: r.contact_email ?? (typeof r.contact_info?.email === 'string' ? r.contact_info.email : null),

    riskTierLabel: (r.risk_tier_label ?? null) as VendorRiskTier | null,
    riskTierNumber: numOrNull(r.risk_tier),
    criticality: (r.criticality ?? null) as VendorCriticality | null,
    inherentRisk: r.inherent_risk ?? null,
    residualRisk: r.residual_risk ?? null,
    score: numOrNull(r.score),
    riskScore: numOrNull(r.risk_score),
    complianceScore: numOrNull(r.compliance_score),

    services: r.services ?? null,
    aiUse: r.ai_use ?? null,

    dpaStatus: (r.dpa_status ?? null) as VendorDpaStatus | null,
    dpaSignedAt: r.dpa_signed_at ?? null,
    dpaExpiresAt: r.dpa_expires_at ?? null,
    dataClassification: r.data_classification ?? null,
    dataAccessLevel: r.data_access_level ?? null,
    dataRegions: Array.isArray(r.data_regions) ? r.data_regions : [],
    transferMechanism: r.transfer_mechanism ?? null,

    soc2Certified: r.soc2_certified ?? null,
    soc2ExpiresAt: r.soc2_expires_at ?? null,
    isoCertified: r.iso_certified ?? null,
    isoExpiresAt: r.iso_expires_at ?? null,
    lastPentestAt: r.last_pentest_at ?? null,

    breachHistoryCount: numOrNull(r.breach_history_count),
    lastBreachSummary: r.last_breach_summary ?? null,
    lastBreachAt: r.last_breach_at ?? null,
    slaBreachFlag: r.sla_breach_flag ?? null,
    subprocessorCount: numOrNull(r.subprocessor_count),
    fourthPartyExposure: r.fourth_party_exposure ?? null,
    concentrationRisk: numOrNull(r.concentration_risk),
    riskFlag: r.risk_flag ?? null,

    exitPlanStatus: r.exit_plan_status ?? null,
    exitPlanNotes: r.exit_plan_notes ?? null,
    reassessmentCadenceMonths: numOrNull(r.reassessment_cadence_months),
    reassessmentDueAt: r.reassessment_due_at ?? null,
    lastAssessedAt: r.last_assessed_at ?? null,
    lastAssessment: r.last_assessment ?? null,

    businessOwner: r.business_owner ?? null,
    vendorManager: r.vendor_manager ?? null,
    contractStart: r.contract_start ?? null,
    contractExpiry: r.contract_expiry ?? null,
    renewalNoticeDays: numOrNull(r.renewal_notice_days),
    annualSpend: numOrNull(r.annual_spend),
    spendCurrency: r.spend_currency ?? null,
    insuranceCoverage: r.insurance_coverage ?? null,

    linkedModels: toIdArray(r.linked_models),

    metadata: r.metadata ?? {},
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** camelCase → snake_case. org_id is intentionally absent: the DB default
 *  current_user_org_id() fills it (CLAUDE.md, First principle #3). */
function toRow(v: Partial<VendorRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  const set = (col: string, val: unknown) => { if (val !== undefined) row[col] = val }

  if (v.id) row.id = v.id
  set('name', v.name)
  set('category', v.category)
  set('description', v.description)
  set('status', v.status)
  set('website', v.website)
  set('contact_email', v.contactEmail)

  set('risk_tier_label', v.riskTierLabel)
  set('criticality', v.criticality)
  set('inherent_risk', v.inherentRisk)
  set('residual_risk', v.residualRisk)
  set('score', v.score)

  set('services', v.services)
  set('ai_use', v.aiUse)

  set('dpa_status', v.dpaStatus)
  set('dpa_signed_at', v.dpaSignedAt || null)
  set('dpa_expires_at', v.dpaExpiresAt || null)
  set('data_classification', v.dataClassification)
  set('data_access_level', v.dataAccessLevel)
  set('data_regions', v.dataRegions)
  set('transfer_mechanism', v.transferMechanism)

  set('soc2_certified', v.soc2Certified)
  set('soc2_expires_at', v.soc2ExpiresAt || null)
  set('iso_certified', v.isoCertified)
  set('iso_expires_at', v.isoExpiresAt || null)
  set('last_pentest_at', v.lastPentestAt || null)

  set('breach_history_count', v.breachHistoryCount)
  set('last_breach_summary', v.lastBreachSummary)
  set('subprocessor_count', v.subprocessorCount)
  set('fourth_party_exposure', v.fourthPartyExposure)

  set('exit_plan_status', v.exitPlanStatus)
  set('exit_plan_notes', v.exitPlanNotes)
  set('reassessment_cadence_months', v.reassessmentCadenceMonths)
  set('reassessment_due_at', v.reassessmentDueAt || null)
  set('last_assessed_at', v.lastAssessedAt)

  set('business_owner', v.businessOwner)
  set('vendor_manager', v.vendorManager)
  set('contract_start', v.contractStart || null)
  set('contract_expiry', v.contractExpiry || null)
  set('renewal_notice_days', v.renewalNoticeDays)
  set('annual_spend', v.annualSpend)
  set('spend_currency', v.spendCurrency)
  set('insurance_coverage', v.insuranceCoverage)

  set('linked_models', v.linkedModels)
  set('metadata', v.metadata)

  row.updated_at = new Date().toISOString()
  return row
}

// ── reads ──────────────────────────────────────────────────────────────────

export interface VendorFilters {
  status?: string
  riskTierLabel?: string
  criticality?: string
  category?: string
}

/**
 * Reads throw so the caller can render a real error state.
 *
 * The parameter is widened to `Record<string, any>` deliberately: several
 * callers pass `fetchVendors` straight to React Query as a `queryFn`, which
 * invokes it with a QueryFunctionContext. Unknown keys are ignored below.
 */
export async function fetchAllVendors(filters: VendorFilters & Record<string, any> = {}): Promise<VendorRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('vendors').select('*').order('created_at', { ascending: false })
  if (filters.status) q = q.eq('status', filters.status)
  if (filters.riskTierLabel) q = q.eq('risk_tier_label', filters.riskTierLabel)
  if (filters.criticality) q = q.eq('criticality', filters.criticality)
  if (filters.category) q = q.eq('category', filters.category)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map(fromRow)
}

/** Single vendor by uuid. Returns null when the id does not resolve so the
 *  detail page can render an honest "not found" instead of a crash. */
export async function fetchVendorById(id: string): Promise<VendorRecord | null> {
  if (!isSupabaseConfigured() || !supabase) return null
  if (!id) return null
  const { data, error } = await supabase.from('vendors').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? fromRow(data) : null
}

/** id → name, for resolving interlinks without pulling whole rows. */
export async function fetchVendorOptions(): Promise<{ id: string; name: string }[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase.from('vendors').select('id, name').order('name')
  if (error) throw new Error(error.message)
  return (data ?? []).map((r: any) => ({ id: r.id, name: r.name ?? '' }))
}

export interface VendorConcentrationSlice {
  vendorId: string
  vendorName: string
  modelCount: number
  pct: number
}

/**
 * Real concentration of the governed model estate across vendors.
 *
 * The link that exists in the schema is `vendors.linked_models` — an array of
 * `ai_models.id` uuids (one id-space). We count only ids that RESOLVE to a
 * live model row, so a stale link inflates nothing. The denominator is the
 * number of distinct models actually attributed to some vendor; when that is
 * zero the caller renders an honest empty state rather than a chart.
 */
export async function fetchVendorConcentration(): Promise<{
  slices: VendorConcentrationSlice[]
  attributedModels: number
  totalModels: number
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return { slices: [], attributedModels: 0, totalModels: 0 }
  }
  const [vendorsRes, modelsRes] = await Promise.all([
    supabase.from('vendors').select('id, name, linked_models'),
    supabase.from('ai_models').select('id'),
  ])
  if (vendorsRes.error) throw new Error(vendorsRes.error.message)
  if (modelsRes.error) throw new Error(modelsRes.error.message)

  const liveModelIds = new Set((modelsRes.data ?? []).map((m: any) => m.id))
  const attributed = new Set<string>()
  const rows = (vendorsRes.data ?? []).map((v: any) => {
    const ids = toIdArray(v.linked_models).filter((id) => liveModelIds.has(id))
    ids.forEach((id) => attributed.add(id))
    return { vendorId: v.id as string, vendorName: (v.name ?? '') as string, modelCount: ids.length }
  }).filter((r) => r.modelCount > 0)

  const denominator = attributed.size
  const slices = rows
    .map((r) => ({ ...r, pct: denominator ? (r.modelCount / denominator) * 100 : 0 }))
    .sort((a, b) => b.modelCount - a.modelCount)

  return { slices, attributedModels: denominator, totalModels: liveModelIds.size }
}

// ── writes (throw; audit-logged) ───────────────────────────────────────────

export async function createVendor(record: Partial<VendorRecord>): Promise<VendorRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save vendor.')
  if (!record.name) throw new Error('Vendor name is required.')
  const { id, ...rest } = toRow(record)
  void id
  const { data, error } = await supabase.from('vendors').insert(rest).select().single()
  if (error) throw new Error(error.message)
  const saved = fromRow(data)
  void logAction({
    module: 'vendors', entityType: 'vendors', entityId: saved.id, entityName: saved.name,
    action: 'create', newValues: rest,
  })
  return saved
}

export async function updateVendor(id: string, patch: Partial<VendorRecord>): Promise<VendorRecord> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot save vendor.')
  if (!id) throw new Error('Vendor id is required for an update.')
  const before = await fetchVendorById(id)
  const row = toRow(patch)
  delete row.id
  const { data, error } = await supabase.from('vendors').update(row).eq('id', id).select().single()
  if (error) throw new Error(error.message)
  const saved = fromRow(data)
  void logAction({
    module: 'vendors', entityType: 'vendors', entityId: saved.id, entityName: saved.name,
    action: 'update', oldValues: before ?? undefined, newValues: row,
  })
  return saved
}

export async function upsertVendor(record: Partial<VendorRecord>): Promise<VendorRecord> {
  return record.id ? updateVendor(record.id, record) : createVendor(record)
}

export async function deleteVendor(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) throw new Error('Supabase is not configured — cannot delete vendor.')
  const before = await fetchVendorById(id)
  const { error } = await supabase.from('vendors').delete().eq('id', id)
  if (error) throw new Error(error.message)
  void logAction({
    module: 'vendors', entityType: 'vendors', entityId: id, entityName: before?.name,
    action: 'delete', oldValues: before ?? undefined,
  })
}

export const fetchVendors = fetchAllVendors
export const saveVendor = upsertVendor
