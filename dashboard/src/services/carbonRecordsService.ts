// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Carbon Ledger (`carbon_records`) — per-model GHG accounting for AI workloads
// (GHG Protocol scope tagging, offset retirement detail, assurance record).
//
// THREE DEFECTS THIS REWRITE CLOSES:
//  1. the service swallowed every write error (`catch { return record }`), so
//     the page reported a save that never persisted;
//  2. it wrote a client-supplied `tenant_id` — a column that has since been
//     DROPPED, and client-supplied scoping is banned anyway. org_id is filled
//     DB-side by `current_user_org_id()`, exactly as `ai_models` does;
//  3. the model was free text. It is now `model_id uuid` on the one id-space,
//     resolved to a display name at render time.
//
// Numbers are stored as given — nothing is coalesced to 0 on the way in or
// out. NULL means "not reported" and must render as an em-dash, never as 0:
// "0.0 tCO₂e" reads as carbon neutral.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

/** How the figure was arrived at. Never inferred — the recorder declares it. */
export type MeasurementMethod = 'measured' | 'calculated' | 'estimated'

/** GHG Protocol scope, incl. the market/location split for scope 2. */
export type GhgScope = 'scope_1' | 'scope_2_market' | 'scope_2_location' | 'scope_3'

export interface CarbonRecord {
  id: string
  /** → ai_models.id. Null for legacy rows; render "Unavailable", never a uuid. */
  modelId: string | null
  period: string | null
  periodStart: string | null
  periodEnd: string | null
  trainingEmissions: number | null
  inferenceEmissions: number | null
  totalEmissions: number | null
  energyKwh: number | null
  renewablePercent: number | null
  computeProvider: string | null
  region: string | null
  offsetTco2e: number | null
  netEmissions: number | null
  verified: boolean
  efficiencyScore: number | null
  measurementMethod: MeasurementMethod | null
  /** → emission_factors.id — required before a derived figure may be shown. */
  emissionFactorId: string | null
  ghgScope: GhgScope | null
  gpuHours: number | null
  tokensProcessed: number | null
  acceleratorType: string | null
  pue: number | null
  waterUsageM3: number | null
  offsetRegistry: string | null
  offsetSerial: string | null
  offsetVintageYear: number | null
  offsetRetiredAt: string | null
  assuranceBody: string | null
  assuranceDate: string | null
  methodology: string | null
  notes: string | null
  /** carbon_records.metadata (jsonb) — e.g. the demo importer's marker. */
  metadata?: Record<string, unknown>
  createdAt?: string
  updatedAt?: string
}

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)

const txt = (v: unknown): string | null =>
  typeof v === 'string' && v.trim().length > 0 ? v : null

export function fromRow(r: Record<string, any>): CarbonRecord {
  return {
    id: r.id,
    modelId: r.model_id ?? null,
    period: txt(r.period),
    periodStart: r.period_start ?? null,
    periodEnd: r.period_end ?? null,
    trainingEmissions: num(r.training_emissions),
    inferenceEmissions: num(r.inference_emissions),
    totalEmissions: num(r.total_emissions),
    energyKwh: num(r.energy_kwh),
    renewablePercent: num(r.renewable_percent),
    computeProvider: txt(r.compute_provider),
    region: txt(r.region),
    offsetTco2e: num(r.offset_tco2e),
    netEmissions: num(r.net_emissions),
    verified: r.verified === true,
    efficiencyScore: num(r.efficiency_score),
    measurementMethod: (txt(r.measurement_method) as MeasurementMethod | null),
    emissionFactorId: r.emission_factor_id ?? null,
    ghgScope: (txt(r.ghg_scope) as GhgScope | null),
    gpuHours: num(r.gpu_hours),
    tokensProcessed: num(r.tokens_processed),
    acceleratorType: txt(r.accelerator_type),
    pue: num(r.pue),
    waterUsageM3: num(r.water_usage_m3),
    offsetRegistry: txt(r.offset_registry),
    offsetSerial: txt(r.offset_serial),
    offsetVintageYear: num(r.offset_vintage_year),
    offsetRetiredAt: r.offset_retired_at ?? null,
    assuranceBody: txt(r.assurance_body),
    assuranceDate: r.assurance_date ?? null,
    methodology: txt(r.methodology),
    notes: txt(r.description),
    metadata: (r.metadata && typeof r.metadata === 'object' ? r.metadata : {}) as Record<string, unknown>,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/**
 * camelCase → snake_case. Only keys the caller actually set are emitted, so a
 * partial update never blanks a column it did not mean to touch. org_id is
 * deliberately absent: the DB default (`current_user_org_id()`) owns scoping.
 */
function toRow(c: Partial<CarbonRecord>): Record<string, any> {
  const row: Record<string, any> = {}
  const set = (key: string, value: unknown) => { row[key] = value }
  if (c.modelId !== undefined) set('model_id', c.modelId || null)
  if (c.period !== undefined) set('period', c.period || null)
  if (c.periodStart !== undefined) set('period_start', c.periodStart || null)
  if (c.periodEnd !== undefined) set('period_end', c.periodEnd || null)
  if (c.trainingEmissions !== undefined) set('training_emissions', c.trainingEmissions)
  if (c.inferenceEmissions !== undefined) set('inference_emissions', c.inferenceEmissions)
  if (c.totalEmissions !== undefined) set('total_emissions', c.totalEmissions)
  if (c.energyKwh !== undefined) set('energy_kwh', c.energyKwh)
  if (c.renewablePercent !== undefined) set('renewable_percent', c.renewablePercent)
  if (c.computeProvider !== undefined) set('compute_provider', c.computeProvider || null)
  if (c.region !== undefined) set('region', c.region || null)
  if (c.offsetTco2e !== undefined) set('offset_tco2e', c.offsetTco2e)
  if (c.netEmissions !== undefined) set('net_emissions', c.netEmissions)
  if (c.verified !== undefined) set('verified', c.verified)
  if (c.efficiencyScore !== undefined) set('efficiency_score', c.efficiencyScore)
  if (c.measurementMethod !== undefined) set('measurement_method', c.measurementMethod || null)
  if (c.emissionFactorId !== undefined) set('emission_factor_id', c.emissionFactorId || null)
  if (c.ghgScope !== undefined) set('ghg_scope', c.ghgScope || null)
  if (c.gpuHours !== undefined) set('gpu_hours', c.gpuHours)
  if (c.tokensProcessed !== undefined) set('tokens_processed', c.tokensProcessed)
  if (c.acceleratorType !== undefined) set('accelerator_type', c.acceleratorType || null)
  if (c.pue !== undefined) set('pue', c.pue)
  if (c.waterUsageM3 !== undefined) set('water_usage_m3', c.waterUsageM3)
  if (c.offsetRegistry !== undefined) set('offset_registry', c.offsetRegistry || null)
  if (c.offsetSerial !== undefined) set('offset_serial', c.offsetSerial || null)
  if (c.offsetVintageYear !== undefined) set('offset_vintage_year', c.offsetVintageYear)
  if (c.offsetRetiredAt !== undefined) set('offset_retired_at', c.offsetRetiredAt || null)
  if (c.assuranceBody !== undefined) set('assurance_body', c.assuranceBody || null)
  if (c.assuranceDate !== undefined) set('assurance_date', c.assuranceDate || null)
  if (c.methodology !== undefined) set('methodology', c.methodology || null)
  if (c.notes !== undefined) set('description', c.notes || null)
  if (c.metadata !== undefined) set('metadata', c.metadata)
  return row
}

export async function fetchCarbonRecords(filters: { modelId?: string; period?: string } = {}): Promise<CarbonRecord[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('carbon_records').select('*').order('created_at', { ascending: false })
  if (filters.modelId) q = q.eq('model_id', filters.modelId)
  if (filters.period) q = q.eq('period', filters.period)
  const { data, error } = await q
  if (error) { console.warn('[carbonRecordsService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(fromRow)
}

export async function fetchCarbonRecord(id: string): Promise<CarbonRecord | null> {
  if (!isSupabaseConfigured() || !supabase || !id) return null
  const { data, error } = await supabase.from('carbon_records').select('*').eq('id', id).single()
  if (error) { console.warn('[carbonRecordsService] fetch one:', error.message); throw new Error(error.message) }
  return data ? fromRow(data) : null
}

/**
 * Writes THROW on failure (config / RLS / CHECK / network) so the UI shows a
 * real error instead of a false success. Never swallow.
 */
export async function upsertCarbonRecord(record: Partial<CarbonRecord>): Promise<CarbonRecord> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — cannot save carbon record.')
  }
  const isNew = !record.id
  const row = toRow(record)
  if (record.id) row.id = record.id
  const { data, error } = await supabase.from('carbon_records').upsert(row).select().single()
  if (error) { console.warn('[carbonRecordsService] upsert:', error.message); throw new Error(error.message) }
  const saved = fromRow(data)
  // EU AI Act Art. 12 traceability: every state change is attributable.
  await logAction({
    module: 'carbon-ledger',
    entityType: 'carbon_record',
    entityId: saved.id,
    entityName: saved.period ?? 'Carbon record',
    action: isNew ? 'create' : 'update',
    newValues: row,
  })
  return saved
}

export async function deleteCarbonRecord(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — cannot delete carbon record.')
  }
  const { error } = await supabase.from('carbon_records').delete().eq('id', id)
  if (error) { console.warn('[carbonRecordsService] delete:', error.message); throw new Error(error.message) }
  await logAction({
    module: 'carbon-ledger',
    entityType: 'carbon_record',
    entityId: id,
    action: 'delete',
  })
}
