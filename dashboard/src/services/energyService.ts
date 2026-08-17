// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Energy Efficiency (`energy_metrics`) — per-model electricity, accelerator
// and water draw, with the measurement provenance attached to every reading.
//
// DEFECTS THIS REWRITE CLOSES:
//  * writes returned `null` on error, so the page toasted a success for an
//    insert PostgREST had rejected — writes now THROW;
//  * the page wrote a `model` column that does not exist (the real one is
//    `model_name`), so EVERY insert failed; readings now carry `model_id` on
//    the one id-space with `model_name` kept only as the legacy display label;
//  * `pue` was ignored on read while a literal 1.3 was injected into charts —
//    the real column is mapped here and is the only PUE the UI may show;
//  * `measurement_source` never reached the table or the aggregates, so
//    smart-metered and self-declared estimated readings were averaged
//    together with nothing to tell them apart.
//
// Nothing is coalesced to 0: NULL means "not reported" and renders as an
// em-dash. efficiency_score is on a DB-CHECKed 0–100 scale.

import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { logAction } from '../lib/auditLogger'

/** Provenance of the reading — metered, billed, or self-declared estimate. */
export const MEASUREMENT_SOURCES = [
  'Smart Meter',
  'Cloud Console',
  'API Usage Report',
  'Third-party Audit',
  'Estimated',
] as const
export type MeasurementSource = (typeof MEASUREMENT_SOURCES)[number]

/** Sources whose values are self-declared rather than metered/billed. */
export const ESTIMATED_SOURCES: string[] = ['Estimated']

export interface EnergyMetric {
  id: string
  /** → ai_models.id. Null for legacy rows. */
  modelId: string | null
  /** Legacy display label from before the id-space; never a uuid. */
  modelName: string | null
  period: string | null
  gpuHours: number | null
  kwh: number | null
  tokensGenerated: number | null
  efficiencyScore: number | null
  renewablePercent: number | null
  computeProvider: string | null
  measurementSource: string | null
  pue: number | null
  acceleratorType: string | null
  gpuUtilizationPercent: number | null
  region: string | null
  gridIntensityGPerKwh: number | null
  co2eKg: number | null
  /** → emission_factors.id — the citation for any derived CO2e. */
  emissionFactorId: string | null
  instanceCount: number | null
  deploymentType: string | null
  waterUsageM3: number | null
  notes: string | null
  recordedAt: string | null
  createdAt?: string
  updatedAt?: string
}

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)

const txt = (v: unknown): string | null =>
  typeof v === 'string' && v.trim().length > 0 ? v : null

export function fromRow(r: Record<string, any>): EnergyMetric {
  return {
    id: r.id,
    modelId: r.model_id ?? null,
    modelName: txt(r.model_name),
    period: txt(r.period),
    gpuHours: num(r.gpu_hours),
    kwh: num(r.kwh),
    tokensGenerated: num(r.tokens_generated),
    efficiencyScore: num(r.efficiency_score),
    renewablePercent: num(r.renewable_percent),
    computeProvider: txt(r.compute_provider),
    measurementSource: txt(r.measurement_source),
    pue: num(r.pue),
    acceleratorType: txt(r.accelerator_type),
    gpuUtilizationPercent: num(r.gpu_utilization_percent),
    region: txt(r.region),
    gridIntensityGPerKwh: num(r.grid_intensity_g_per_kwh),
    co2eKg: num(r.co2e_kg),
    emissionFactorId: r.emission_factor_id ?? null,
    instanceCount: num(r.instance_count),
    deploymentType: txt(r.deployment_type),
    waterUsageM3: num(r.water_usage_m3),
    notes: txt(r.notes),
    recordedAt: r.recorded_at ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

/** camelCase → snake_case; only keys the caller set are written. */
function toRow(m: Partial<EnergyMetric>): Record<string, any> {
  const row: Record<string, any> = {}
  if (m.modelId !== undefined) row.model_id = m.modelId || null
  if (m.modelName !== undefined) row.model_name = m.modelName || null
  if (m.period !== undefined) row.period = m.period || null
  if (m.gpuHours !== undefined) row.gpu_hours = m.gpuHours
  if (m.kwh !== undefined) row.kwh = m.kwh
  if (m.tokensGenerated !== undefined) row.tokens_generated = m.tokensGenerated
  if (m.efficiencyScore !== undefined) row.efficiency_score = m.efficiencyScore
  if (m.renewablePercent !== undefined) row.renewable_percent = m.renewablePercent
  if (m.computeProvider !== undefined) row.compute_provider = m.computeProvider || null
  if (m.measurementSource !== undefined) row.measurement_source = m.measurementSource || null
  if (m.pue !== undefined) row.pue = m.pue
  if (m.acceleratorType !== undefined) row.accelerator_type = m.acceleratorType || null
  if (m.gpuUtilizationPercent !== undefined) row.gpu_utilization_percent = m.gpuUtilizationPercent
  if (m.region !== undefined) row.region = m.region || null
  if (m.gridIntensityGPerKwh !== undefined) row.grid_intensity_g_per_kwh = m.gridIntensityGPerKwh
  if (m.co2eKg !== undefined) row.co2e_kg = m.co2eKg
  if (m.emissionFactorId !== undefined) row.emission_factor_id = m.emissionFactorId || null
  if (m.instanceCount !== undefined) row.instance_count = m.instanceCount
  if (m.deploymentType !== undefined) row.deployment_type = m.deploymentType || null
  if (m.waterUsageM3 !== undefined) row.water_usage_m3 = m.waterUsageM3
  if (m.notes !== undefined) row.notes = m.notes || null
  if (m.recordedAt !== undefined) row.recorded_at = m.recordedAt || null
  return row
}

export async function fetchEnergyMetrics(filters: { modelId?: string; period?: string } = {}): Promise<EnergyMetric[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  let q = supabase.from('energy_metrics').select('*').order('created_at', { ascending: false })
  if (filters.modelId) q = q.eq('model_id', filters.modelId)
  if (filters.period) q = q.eq('period', filters.period)
  const { data, error } = await q
  if (error) { console.warn('[energyService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(fromRow)
}

/** Writes THROW — a rejected insert must never surface as a success toast. */
export async function upsertEnergyMetric(record: Partial<EnergyMetric>): Promise<EnergyMetric> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — cannot save energy reading.')
  }
  const isNew = !record.id
  const row = toRow(record)
  if (record.id) row.id = record.id
  const { data, error } = await supabase.from('energy_metrics').upsert(row).select().single()
  if (error) { console.warn('[energyService] upsert:', error.message); throw new Error(error.message) }
  const saved = fromRow(data)
  await logAction({
    module: 'energy-efficiency',
    entityType: 'energy_metric',
    entityId: saved.id,
    entityName: saved.modelName ?? saved.period ?? 'Energy reading',
    action: isNew ? 'create' : 'update',
    newValues: row,
  })
  return saved
}

export async function deleteEnergyMetric(id: string): Promise<void> {
  if (!isSupabaseConfigured() || !supabase) {
    throw new Error('Supabase is not configured — cannot delete energy reading.')
  }
  const { error } = await supabase.from('energy_metrics').delete().eq('id', id)
  if (error) { console.warn('[energyService] delete:', error.message); throw new Error(error.message) }
  await logAction({
    module: 'energy-efficiency',
    entityType: 'energy_metric',
    entityId: id,
    action: 'delete',
  })
}
