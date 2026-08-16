// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hook for the GDPR Arts. 15–22 rights register.
//
// Error toasts carry the database's own message rather than a generic
// "Failed to save": the vocabularies are CHECK-constrained, so a rejected
// write usually names the constraint it violated, and hiding that behind a
// generic string is how the earlier silent-failure defects went unnoticed.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAllDsrRequests, fetchDsrRequest, upsertDsrRequests, deleteDsrRequests,
  type DsrRequest,
} from '@/services/dsrRequestsService'
import { toast } from 'sonner'

export function useDsrRequestsData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['dsrRequests', filters],
    queryFn: () => fetchAllDsrRequests(filters),
    staleTime: 30_000,
  })

  const inv = () => qc.invalidateQueries({ queryKey: ['dsrRequests'] })

  const saveMutation = useMutation({
    mutationFn: (record: Partial<DsrRequest>) => upsertDsrRequests(record),
    onSuccess: () => { inv(); toast.success('Request saved') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to save request'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDsrRequests(id),
    onSuccess: () => { inv(); toast.success('Request deleted') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to delete request'),
  })

  return {
    items, isLoading, error,
    saveDsrRequests: saveMutation.mutateAsync,
    removeDsrRequests: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useDsrRequestsById(id: string) {
  return useQuery({
    queryKey: ['dsrRequests', id],
    queryFn: () => fetchDsrRequest(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
