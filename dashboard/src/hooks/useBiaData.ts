// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hook for Business Impact Analysis. Mutations invalidate the list;
// the service throws on failure, so a success toast only fires after a real
// resolve.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchBiaRecords, createBiaRecord, updateBiaRecord, deleteBiaRecord, type BiaRecord,
} from '@/services/biaService'

const KEY = ['bia-records']

export function useBiaData(filters: { assetId?: string } = {}) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: [...KEY, filters.assetId ?? 'all'],
    queryFn: () => fetchBiaRecords(filters),
    staleTime: 20_000,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY })

  const create = useMutation({
    mutationFn: (record: Partial<BiaRecord>) => createBiaRecord(record),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<BiaRecord> }) => updateBiaRecord(id, patch),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteBiaRecord(id),
    onSuccess: invalidate,
  })

  return {
    records: list.data ?? [],
    isLoading: list.isLoading,
    error: list.error as Error | null,
    refetch: list.refetch,
    create, update, remove,
  }
}
