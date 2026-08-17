// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query wrapper for energy readings. The service throws on write
// failure; toasts are owned by the page so exactly one, context-rich
// notification fires per action — and only after the write resolves.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchEnergyMetrics, upsertEnergyMetric, deleteEnergyMetric, type EnergyMetric,
} from '@/services/energyService'

export function useEnergyData(filters: { modelId?: string; period?: string } = {}) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['energy-metrics', filters],
    queryFn: () => fetchEnergyMetrics(filters),
    staleTime: 30_000,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['energy-metrics'] })

  const saveMutation = useMutation({
    mutationFn: (r: Partial<EnergyMetric>) => upsertEnergyMetric(r),
    onSuccess: invalidate,
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEnergyMetric(id),
    onSuccess: invalidate,
  })

  return {
    metrics: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
