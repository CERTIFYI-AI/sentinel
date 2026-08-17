// SPDX-License-Identifier: Apache-2.0
// Risk group additions on the platform contract: financial_risks (FAIR
// quantification, was a doc-jsonb demo) and regulation_entries (Risk
// Intelligence backing — obligations, model scope, gap tracking).
// Writes THROW on failure; the client never sends the scoping column.
import { supabase, isSupabaseConfigured } from '../lib/supabase'

function client() {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — risk data is unavailable')
  }
  return supabase
}

async function selectAll<T>(table: string, mapper: (r: any) => T, order = 'created_at'): Promise<T[]> {
  const { data, error } = await client().from(table).select('*').order(order, { ascending: false })
  if (error) {
    console.warn('[riskGroupService] fetch %s failed: %s', table, error.message)
    throw new Error(`Could not load ${table.replace(/_/g, ' ')}: ${error.message}`)
  }
  return (data ?? []).map(mapper)
}

async function upsertRow<T>(table: string, row: Record<string, unknown>, mapper: (r: any) => T): Promise<T> {
  Object.keys(row).forEach((k) => row[k] === undefined && delete row[k])
  const { data, error } = await client().from(table).upsert(row).select().single()
  if (error) throw new Error(`The write to ${table.replace(/_/g, ' ')} did not persist: ${error.message}`)
  return mapper(data)
}

async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await client().from(table).delete().eq('id', id)
  if (error) throw new Error(`Delete from ${table.replace(/_/g, ' ')} failed: ${error.message}`)
}

// ---------------------------------------------------------------------------
// Financial risks (FAIR)
// ---------------------------------------------------------------------------
export interface FinancialRiskRecord {
  id?: string
  finRef?: string
  title: string
  scenario?: string
  modelId?: string | null        // → ai_models.id
  linkedRiskId?: string | null   // → risks.id
  category?: string
  methodology: string
  lossEventFrequency?: number | null
  lossMagnitude?: number | null
  probability?: number | null
  singleLossExpectancy?: number | null
  annualizedLossExpectancy?: number | null
  exposure?: number | null
  currency: string
  owner?: string | null
  status: string                 // draft | quantified | accepted | mitigating
  lastQuantified?: string | null
  controls: { name: string; annual_cost?: number; risk_reduction_pct?: number }[]
  insurance: { policy?: string; carrier?: string; coverage?: number; deductible?: number }
  createdAt?: string
  updatedAt?: string
}

const mapFin = (r: any): FinancialRiskRecord => ({
  id: r.id,
  finRef: r.fin_ref ?? undefined,
  title: r.title,
  scenario: r.scenario ?? undefined,
  modelId: r.model_id ?? null,
  linkedRiskId: r.linked_risk_id ?? null,
  category: r.category ?? undefined,
  methodology: r.methodology ?? 'FAIR',
  lossEventFrequency: r.loss_event_frequency != null ? Number(r.loss_event_frequency) : null,
  lossMagnitude: r.loss_magnitude != null ? Number(r.loss_magnitude) : null,
  probability: r.probability != null ? Number(r.probability) : null,
  singleLossExpectancy: r.single_loss_expectancy != null ? Number(r.single_loss_expectancy) : null,
  annualizedLossExpectancy: r.annualized_loss_expectancy != null ? Number(r.annualized_loss_expectancy) : null,
  exposure: r.exposure != null ? Number(r.exposure) : null,
  currency: r.currency ?? 'USD',
  owner: r.owner ?? null,
  status: r.status ?? 'draft',
  lastQuantified: r.last_quantified ?? null,
  controls: Array.isArray(r.controls) ? r.controls : [],
  insurance: r.insurance ?? {},
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const fetchFinancialRisks = () => selectAll('financial_risks', mapFin)

/** ALE = LEF × LM (computed, not typed in). SLE mirrors loss magnitude. */
export function computeFair(lef?: number | null, lm?: number | null) {
  if (lef == null || lm == null) return { sle: null, ale: null }
  return { sle: lm, ale: Math.round(lef * lm) }
}

export const saveFinancialRisk = (f: FinancialRiskRecord) => {
  const { sle, ale } = computeFair(f.lossEventFrequency, f.lossMagnitude)
  return upsertRow('financial_risks', {
    id: f.id,
    fin_ref: f.finRef,
    title: f.title,
    scenario: f.scenario,
    model_id: f.modelId || null,
    linked_risk_id: f.linkedRiskId || null,
    category: f.category,
    methodology: f.methodology,
    loss_event_frequency: f.lossEventFrequency,
    loss_magnitude: f.lossMagnitude,
    probability: f.probability,
    single_loss_expectancy: sle ?? f.singleLossExpectancy,
    annualized_loss_expectancy: ale ?? f.annualizedLossExpectancy,
    exposure: f.exposure,
    currency: f.currency,
    owner: f.owner,
    status: f.status,
    last_quantified: f.lastQuantified,
    controls: f.controls,
    insurance: f.insurance,
    updated_at: new Date().toISOString(),
  }, mapFin)
}
export const deleteFinancialRisk = (id: string) => deleteRow('financial_risks', id)

// ---------------------------------------------------------------------------
// Regulation entries (Risk Intelligence)
// ---------------------------------------------------------------------------
export interface RegulationEntryRecord {
  id?: string
  regulationRef?: string
  name: string
  jurisdiction?: string
  status?: string                // Enacted | Guidance | Draft
  effectiveOn?: string | null
  relevanceScore?: number | null
  requirementsSummary?: string | null
  obligations: { ref: string; title: string; status: string }[]
  modelsInScope?: number | null
  controlsMapped?: number | null
  gapPercent?: number | null
  alertOnChange: boolean
  owner?: string | null
  sourceUrl?: string | null
  linkedModelIds?: string[]
  linkedRiskIds?: string[]
  createdAt?: string
  updatedAt?: string
}

const mapReg = (r: any): RegulationEntryRecord => ({
  id: r.id,
  regulationRef: r.regulation_ref ?? undefined,
  name: r.name,
  jurisdiction: r.jurisdiction ?? undefined,
  status: r.status ?? undefined,
  effectiveOn: r.effective_on ?? null,
  relevanceScore: r.relevance_score != null ? Number(r.relevance_score) : null,
  requirementsSummary: r.requirements_summary ?? null,
  obligations: Array.isArray(r.obligations) ? r.obligations : [],
  modelsInScope: r.models_in_scope ?? null,
  controlsMapped: r.controls_mapped ?? null,
  gapPercent: r.gap_percent != null ? Number(r.gap_percent) : null,
  alertOnChange: r.alert_on_change ?? true,
  owner: r.owner ?? null,
  sourceUrl: r.source_url ?? null,
  linkedModelIds: r.linked_model_ids ?? [],
  linkedRiskIds: r.linked_risk_ids ?? [],
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

export const fetchRegulationEntries = () => selectAll('regulation_entries', mapReg)
export const saveRegulationEntry = (e: RegulationEntryRecord) =>
  upsertRow('regulation_entries', {
    id: e.id,
    regulation_ref: e.regulationRef,
    name: e.name,
    jurisdiction: e.jurisdiction,
    status: e.status,
    effective_on: e.effectiveOn,
    relevance_score: e.relevanceScore,
    requirements_summary: e.requirementsSummary,
    obligations: e.obligations,
    models_in_scope: e.modelsInScope,
    controls_mapped: e.controlsMapped,
    gap_percent: e.gapPercent,
    alert_on_change: e.alertOnChange,
    owner: e.owner,
    source_url: e.sourceUrl,
    linked_model_ids: e.linkedModelIds,
    linked_risk_ids: e.linkedRiskIds,
    updated_at: new Date().toISOString(),
  }, mapReg)
export const deleteRegulationEntry = (id: string) => deleteRow('regulation_entries', id)

/** Days until a regulation takes effect — computed at render time from the
 *  typed date, never a frozen literal. Negative = already in force. */
export function daysUntil(effectiveOn?: string | null): number | null {
  if (!effectiveOn) return null
  const d = new Date(effectiveOn + 'T00:00:00Z').getTime()
  if (Number.isNaN(d)) return null
  return Math.round((d - Date.now()) / 86_400_000)
}
