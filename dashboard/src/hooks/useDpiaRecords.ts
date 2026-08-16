// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hook for the GDPR Art. 35 DPIA register.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createDpiaRecord, fetchDpiaRecords, softDeleteDpiaRecord, updateDpiaRecord,
  type DpiaRecord,
} from '@/services/dpiaService'

export function useDpiaRecords() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['dpia_assessments'], queryFn: fetchDpiaRecords, staleTime: 30_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['dpia_assessments'] })
  const create = useMutation({ mutationFn: (d: Partial<DpiaRecord>) => createDpiaRecord(d), onSuccess: inv })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<DpiaRecord> }) => updateDpiaRecord(id, patch),
    onSuccess: inv,
  })
  const remove = useMutation({ mutationFn: (id: string) => softDeleteDpiaRecord(id), onSuccess: inv })
  return {
    data: list.data ?? [],
    isLoading: list.isLoading, isError: list.isError,
    error: list.error as Error | null, refetch: list.refetch,
    create, update, remove,
  }
}
