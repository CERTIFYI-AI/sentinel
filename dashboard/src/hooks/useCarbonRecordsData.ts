// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query wrapper for the Carbon Ledger. Reads are cached and shared;
// mutations invalidate the list. The service throws on write failure, so a
// rejected write lands in `onError` at the call site instead of being reported
// as a success.
//
// TOASTS ARE OWNED BY THE PAGE (as in useModelsData): the hook used to fire a
// generic "Record saved" in onSuccess while the page fired its own toast
// BEFORE awaiting, so a failed save produced two success toasts and no error.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchCarbonRecords, fetchCarbonRecord, upsertCarbonRecord, deleteCarbonRecord,
  type CarbonRecord,
} from '@/services/carbonRecordsService'

export function useCarbonRecordsData(filters: { modelId?: string; period?: string } = {}) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['carbon-records', filters],
    queryFn: () => fetchCarbonRecords(filters),
    staleTime: 30_000,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['carbon-records'] })

  const saveMutation = useMutation({
    mutationFn: (record: Partial<CarbonRecord>) => upsertCarbonRecord(record),
    onSuccess: invalidate,
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCarbonRecord(id),
    onSuccess: invalidate,
  })

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    saveCarbonRecord: saveMutation.mutateAsync,
    removeCarbonRecord: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useCarbonRecord(id: string | undefined) {
  return useQuery({
    queryKey: ['carbon-record', id],
    queryFn: () => fetchCarbonRecord(id as string),
    enabled: !!id,
    staleTime: 30_000,
  })
}
