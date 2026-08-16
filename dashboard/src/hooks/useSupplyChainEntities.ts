// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// useSupplyChainEntities — the shared name resolver for the AI Supply Chain
// cluster (AIBOM, Provenance, Graph, Attestations).
//
// First principle #2 (one id-space): supply-chain records store ai_models.id /
// vendors.id / datasets.id / use_cases.id and resolve the display name at
// render time. This hook is that resolution point, so no page ever renders a
// raw uuid — an id that does not resolve renders "Unavailable", and a null id
// renders an em-dash.

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchAllModels } from '@/services/modelService'
import { fetchVendors } from '@/services/vendorService'
import { fetchDatasets } from '@/services/datasetService'
import { fetchUseCases } from '@/services/useCaseService'

export interface EntityRef {
  id: string
  name: string
  /**
   * The risk classification the owning register actually records
   * (ai_models.risk_tier, vendors.risk_tier, use_cases.ai_risk_classification,
   * datasets.classification). `null` means the register does not record one —
   * it is never substituted with a computed or default value.
   */
  risk: string | null
}

/** How an unresolved id renders — never the uuid itself. */
export const UNAVAILABLE = 'Unavailable'
/** How a missing (null) id renders. Never 0, never 'N/A'. */
export const DASH = '—'

export type EntityKind = 'model' | 'vendor' | 'dataset' | 'use_case'

export interface SupplyChainEntities {
  models: EntityRef[]
  vendors: EntityRef[]
  datasets: EntityRef[]
  useCases: EntityRef[]
  loading: boolean
  /**
   * Resolve an id to its display name.
   * - `null`/`undefined` id → null (caller renders an em-dash)
   * - unresolved id → UNAVAILABLE (never the raw uuid)
   */
  resolve: (kind: EntityKind, id: string | null | undefined) => string | null
  /** Route for an entity's detail page, or null when there is nothing to link to. */
  routeFor: (kind: EntityKind, id: string | null | undefined) => string | null
}

export function useSupplyChainEntities(): SupplyChainEntities {
  const models = useQuery({
    queryKey: ['model-options'],
    queryFn: async (): Promise<EntityRef[]> =>
      (await fetchAllModels()).map(m => ({ id: m.id, name: m.name, risk: m.risk_tier ?? null })),
    staleTime: 60_000,
  })
  const vendors = useQuery({
    queryKey: ['vendors'],
    queryFn: () => fetchVendors(),
    staleTime: 60_000,
  })
  const datasets = useQuery({
    queryKey: ['datasets'],
    queryFn: fetchDatasets,
    staleTime: 60_000,
  })
  const useCases = useQuery({
    queryKey: ['use-cases'],
    queryFn: fetchUseCases,
    staleTime: 60_000,
  })

  const loading = models.isLoading || vendors.isLoading || datasets.isLoading || useCases.isLoading

  // Memoised so the returned object keeps a stable identity between renders —
  // the supply-chain graph derives its whole layout from these lists, and a new
  // array on every render would recompute it on every pan and zoom frame.
  return useMemo<SupplyChainEntities>(() => {
    const modelRefs: EntityRef[] = models.data ?? []
    const vendorRefs: EntityRef[] = (vendors.data ?? []).map(v => ({ id: v.id, name: v.name, risk: v.riskTierLabel ?? v.criticality ?? null }))
    const datasetRefs: EntityRef[] = (datasets.data ?? []).map(d => ({ id: d.id, name: d.name, risk: d.classification ?? null }))
    const useCaseRefs: EntityRef[] = (useCases.data ?? []).map(u => ({ id: u.id, name: u.title, risk: u.riskClass ?? null }))

    const listFor = (kind: EntityKind): EntityRef[] =>
      kind === 'model' ? modelRefs
        : kind === 'vendor' ? vendorRefs
        : kind === 'dataset' ? datasetRefs
        : useCaseRefs

    const resolve = (kind: EntityKind, id: string | null | undefined): string | null => {
      if (!id) return null
      const hit = listFor(kind).find(e => e.id === id)
      if (hit) return hit.name
      // While the lookup lists are still loading we must not claim the id is
      // unresolvable — show a neutral placeholder instead.
      return loading ? '…' : UNAVAILABLE
    }

    const routeFor = (kind: EntityKind, id: string | null | undefined): string | null => {
      if (!id) return null
      if (!listFor(kind).some(e => e.id === id)) return null
      switch (kind) {
        case 'model': return `/models/inventory/${id}`
        case 'vendor': return `/vendors/${id}`
        case 'dataset': return `/datasets/${id}`
        case 'use_case': return `/use-cases/${id}`
      }
    }

    return { models: modelRefs, vendors: vendorRefs, datasets: datasetRefs, useCases: useCaseRefs, loading, resolve, routeFor }
  }, [models.data, vendors.data, datasets.data, useCases.data, loading])
}
