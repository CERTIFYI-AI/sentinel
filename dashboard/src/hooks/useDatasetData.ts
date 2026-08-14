// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hooks for the canonical `datasets` table and its quality
// assessments. Mutations invalidate; pages surface errors from the thrown
// service calls.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDataset, createQualityAssessment, deleteQualityAssessment,
  fetchDataset, fetchDatasets, fetchQualityAssessments,
  softDeleteDataset, updateDataset,
  type DatasetRecord, type QualityAssessment,
} from '@/services/datasetService'

export function useDatasets() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['datasets'], queryFn: fetchDatasets, staleTime: 20_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['datasets'] })
  const create = useMutation({ mutationFn: (d: Partial<DatasetRecord>) => createDataset(d), onSuccess: inv })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DatasetRecord> }) => updateDataset(id, patch),
    onSuccess: () => { inv(); qc.invalidateQueries({ queryKey: ['dataset'] }) },
  })
  const remove = useMutation({ mutationFn: (id: string) => softDeleteDataset(id), onSuccess: inv })
  return {
    data: list.data ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error as Error | null,
    refetch: list.refetch,
    create, update, remove,
  }
}

export function useDataset(id: string | undefined) {
  const q = useQuery({ queryKey: ['dataset', id], queryFn: () => fetchDataset(id!), enabled: !!id })
  return { data: q.data ?? null, isLoading: q.isLoading, isError: q.isError, error: q.error as Error | null }
}

export function useQualityAssessments(datasetId?: string) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ['data-quality', datasetId ?? 'all'],
    queryFn: () => fetchQualityAssessments(datasetId),
    staleTime: 20_000,
  })
  const inv = () => qc.invalidateQueries({ queryKey: ['data-quality'] })
  const create = useMutation({ mutationFn: (a: Partial<QualityAssessment>) => createQualityAssessment(a), onSuccess: inv })
  const remove = useMutation({ mutationFn: (id: string) => deleteQualityAssessment(id), onSuccess: inv })
  return {
    data: list.data ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error as Error | null,
    refetch: list.refetch,
    create, remove,
  }
}
