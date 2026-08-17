// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query wrapper for ESG disclosures. `transition` is the governed
// approval path (submit / approve / publish) and goes through the service so
// the approver identity, timestamp and audit entry are always written.
// Toasts are owned by the page; nothing here reports success on its own.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchEsgReports, upsertEsgReport, deleteEsgReport, transitionEsgReport,
  type EsgReport, type EsgStatus,
} from '@/services/esgService'

export function useEsgData(filters: { status?: EsgStatus } = {}) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['esg-reports', filters],
    queryFn: () => fetchEsgReports(filters),
    staleTime: 30_000,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['esg-reports'] })

  const saveMutation = useMutation({
    mutationFn: (r: Partial<EsgReport>) => upsertEsgReport(r),
    onSuccess: invalidate,
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEsgReport(id),
    onSuccess: invalidate,
  })
  const transitionMutation = useMutation({
    mutationFn: (v: { id: string; to: EsgStatus; previous?: EsgStatus }) =>
      transitionEsgReport(v.id, v.to, v.previous),
    onSuccess: invalidate,
  })

  return {
    reports: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    transition: transitionMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isTransitioning: transitionMutation.isPending,
  }
}
