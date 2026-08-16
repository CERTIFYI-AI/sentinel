// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// Emission factor catalog (`emission_factors`) — the citable reference values
// behind every DERIVED carbon figure in the Sustainability & ESG cluster.
//
// WHY THIS EXISTS. Carbon numbers are trivially fabricated and a reader cannot
// tell a measurement from a guess. The rule for this cluster is: a figure is
// either genuinely stored, or it is derived from a factor that can be cited
// (value + unit + region + source + published year + version) and is labelled
// as an estimate at the point of display. A derivation with no citable factor
// is not rendered at all.
//
// The catalog is a global read-only reference table (RLS: SELECT to
// authenticated, no tenant data) — there are no writes from the client.

import { supabase, isSupabaseConfigured } from '../lib/supabase'

export interface EmissionFactor {
  id: string
  factorRef: string | null
  name: string
  factorValue: number
  /** kgCO2e/kWh | kgCO2e/1B-params | kgCO2e/inference | … */
  factorUnit: string
  region: string | null
  gridIntensityGPerKwh: number | null
  source: string
  sourceUrl: string | null
  publishedYear: number | null
  version: string | null
}

const num = (v: unknown): number | null =>
  v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v)

function fromRow(r: Record<string, any>): EmissionFactor {
  return {
    id: r.id,
    factorRef: r.factor_ref ?? null,
    name: r.name ?? '',
    factorValue: Number(r.factor_value),
    factorUnit: r.factor_unit ?? '',
    region: r.region ?? null,
    gridIntensityGPerKwh: num(r.grid_intensity_g_per_kwh),
    source: r.source ?? '',
    sourceUrl: r.source_url ?? null,
    publishedYear: num(r.published_year),
    version: r.version ?? null,
  }
}

/** Read the factor catalog. Throws so the caller can show a real error. */
export async function fetchEmissionFactors(): Promise<EmissionFactor[]> {
  if (!isSupabaseConfigured() || !supabase) return []
  const { data, error } = await supabase
    .from('emission_factors')
    .select('*')
    .order('published_year', { ascending: false })
  if (error) { console.warn('[emissionFactorService] fetch:', error.message); throw new Error(error.message) }
  return (data ?? []).map(fromRow)
}

/**
 * One-line citation for a derived figure — this string is what makes an
 * estimate honest, so it always carries source and region when known.
 * e.g. "0.233 kgCO2e/kWh · IEA 2024 · EU-West · v2024.1"
 */
export function citeFactor(f: EmissionFactor | null | undefined): string | null {
  if (!f) return null
  const parts = [`${f.factorValue} ${f.factorUnit}`, f.source]
  if (f.region) parts.push(f.region)
  if (f.publishedYear) parts.push(String(f.publishedYear))
  if (f.version) parts.push(`v${f.version}`)
  return parts.join(' · ')
}

/** Index the catalog by id for render-time resolution. */
export function factorIndex(factors: EmissionFactor[]): Record<string, EmissionFactor> {
  const out: Record<string, EmissionFactor> = {}
  for (const f of factors) out[f.id] = f
  return out
}
