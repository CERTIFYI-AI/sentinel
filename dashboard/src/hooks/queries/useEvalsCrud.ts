// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// TanStack Query hooks for Validation & Evals aggregate roots, on the platform
// contract: what you see is what the backend holds. No client-side seed
// fallback — an empty org renders an honest empty state, and a failed read
// renders a real error state (demo data lives in the database, org-scoped).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type EvalsCrud } from '../../services/evalsCrud'
import {
  validationRunsCrud, explainProfilesCrud, metricProfilesCrud,
  datasetCatalogCrud, scenarioTemplatesCrud, scenarioCampaignsCrud, sessionTracesCrud,
} from '../../services/evalsCrud'
// Bias audits are consolidated onto the platform's single bias_audits table —
// the same one Model Detail's Bias History reads.
import { biasAuditsUnifiedCrud } from '../../services/biasAuditRecordsService'
import type {
  ValidationRun, ExplainabilityProfile, BiasAudit, MetricProfile,
  DatasetCatalogEntry, ScenarioTemplate, ScenarioCampaign, SessionTrace,
} from '../../types/evals'

// _legacySeed is accepted for source compatibility with older callers but is
// deliberately IGNORED: seed fallbacks made a broken backend indistinguishable
// from an empty org. Demo data lives in the database, org-scoped.
export function makeHooks<T extends { id: string; state?: string; modelId?: string; version?: number }>(
  crud: EvalsCrud<T>,
  _legacySeed?: T[],
) {
  const key = crud.table

  function useList() {
    return useQuery({
      queryKey: [key],
      queryFn: () => crud.list(),
      staleTime: 30_000,
    })
  }

  function useGet(id: string | undefined) {
    return useQuery({
      queryKey: [key, id],
      enabled: !!id,
      queryFn: () => (id ? crud.get(id) : Promise.resolve(null)),
      staleTime: 30_000,
    })
  }

  function useUpsert() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: (rec: T) => crud.upsert(rec),
      onSuccess: (row) => {
        qc.invalidateQueries({ queryKey: [key] })
        qc.invalidateQueries({ queryKey: [key, row.id] })
      },
    })
  }

  function useDelete() {
    const qc = useQueryClient()
    return useMutation({
      mutationFn: (id: string) => crud.softDelete(id),
      onSuccess: () => qc.invalidateQueries({ queryKey: [key] }),
    })
  }

  return { useList, useGet, useUpsert, useDelete }
}

export const validationRunHooks = makeHooks<ValidationRun>(validationRunsCrud)
export const explainProfileHooks = makeHooks<ExplainabilityProfile>(explainProfilesCrud)
export const biasAuditHooks = makeHooks<BiasAudit>(biasAuditsUnifiedCrud)
export const metricProfileHooks = makeHooks<MetricProfile>(metricProfilesCrud)
export const datasetCatalogHooks = makeHooks<DatasetCatalogEntry>(datasetCatalogCrud)
export const scenarioTemplateHooks = makeHooks<ScenarioTemplate>(scenarioTemplatesCrud)
export const scenarioCampaignHooks = makeHooks<ScenarioCampaign>(scenarioCampaignsCrud)
export const sessionTraceHooks = makeHooks<SessionTrace>(sessionTracesCrud)
