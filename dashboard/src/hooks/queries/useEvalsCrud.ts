// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// TanStack Query hooks for Validation & Evals aggregate roots. Each list falls
// back to seed data when Supabase returns no rows (empty tenant), matching the
// established data-source pattern (useBiasAuditData.ts et al.).

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { type EvalsCrud } from '../../services/evalsCrud'
import {
  validationRunsCrud, explainProfilesCrud, biasAuditsCrud, metricProfilesCrud,
  datasetCatalogCrud, scenarioTemplatesCrud, scenarioCampaignsCrud, sessionTracesCrud,
} from '../../services/evalsCrud'
import {
  VALIDATION_RUNS, EXPLAINABILITY_PROFILES, BIAS_AUDITS, METRIC_PROFILES,
  DATASET_CATALOG, SCENARIO_TEMPLATES, SCENARIO_CAMPAIGNS, SESSION_TRACES,
} from '../../data/evalsSeed'
import type {
  ValidationRun, ExplainabilityProfile, BiasAudit, MetricProfile,
  DatasetCatalogEntry, ScenarioTemplate, ScenarioCampaign, SessionTrace,
} from '../../types/evals'

function makeHooks<T extends { id: string; state?: string; modelId?: string; version?: number }>(
  crud: EvalsCrud<T>,
  seed: T[],
) {
  const key = crud.table

  function useList() {
    return useQuery({
      queryKey: [key],
      queryFn: async () => {
        const rows = await crud.list()
        return rows.length > 0 ? rows : seed
      },
      staleTime: 30_000,
    })
  }

  function useGet(id: string | undefined) {
    return useQuery({
      queryKey: [key, id],
      enabled: !!id,
      queryFn: async () => {
        if (!id) return null
        const row = await crud.get(id)
        return row ?? seed.find((s) => s.id === id) ?? null
      },
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

export const validationRunHooks = makeHooks<ValidationRun>(validationRunsCrud, VALIDATION_RUNS)
export const explainProfileHooks = makeHooks<ExplainabilityProfile>(explainProfilesCrud, EXPLAINABILITY_PROFILES)
export const biasAuditHooks = makeHooks<BiasAudit>(biasAuditsCrud, BIAS_AUDITS)
export const metricProfileHooks = makeHooks<MetricProfile>(metricProfilesCrud, METRIC_PROFILES)
export const datasetCatalogHooks = makeHooks<DatasetCatalogEntry>(datasetCatalogCrud, DATASET_CATALOG)
export const scenarioTemplateHooks = makeHooks<ScenarioTemplate>(scenarioTemplatesCrud, SCENARIO_TEMPLATES)
export const scenarioCampaignHooks = makeHooks<ScenarioCampaign>(scenarioCampaignsCrud, SCENARIO_CAMPAIGNS)
export const sessionTraceHooks = makeHooks<SessionTrace>(sessionTracesCrud, SESSION_TRACES)
