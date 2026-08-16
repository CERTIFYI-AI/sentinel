// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hook for the GDPR Art. 7 consent register.
//
// `withdrawConsentRecord` is a first-class mutation rather than a generic save:
// withdrawal is the one consent transition with a statutory consequence
// (Art. 7(3) — processing must cease), and the withdrawal date must come back
// from the database rather than being guessed in local state, which is what
// the page used to do.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAllConsentRecords, fetchConsentRecord, upsertConsentRecords,
  deleteConsentRecords, withdrawConsent,
  type ConsentRecord,
} from '@/services/consentRecordsService'
import { toast } from 'sonner'

export function useConsentRecordsData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['consentRecords', filters],
    queryFn: () => fetchAllConsentRecords(filters),
    staleTime: 30_000,
  })

  const inv = () => qc.invalidateQueries({ queryKey: ['consentRecords'] })

  const saveMutation = useMutation({
    mutationFn: (record: Partial<ConsentRecord>) => upsertConsentRecords(record),
    onSuccess: () => { inv(); toast.success('Consent record saved') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to save consent record'),
  })

  const withdrawMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => withdrawConsent(id, reason),
    onSuccess: () => { inv(); toast.success('Consent withdrawn') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to withdraw consent'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConsentRecords(id),
    onSuccess: () => { inv(); toast.success('Consent record deleted') },
    onError: (e: any) => toast.error(e?.message ?? 'Failed to delete consent record'),
  })

  return {
    items, isLoading, error,
    saveConsentRecords: saveMutation.mutateAsync,
    withdrawConsentRecord: withdrawMutation.mutateAsync,
    removeConsentRecords: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isWithdrawing: withdrawMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useConsentRecordsById(id: string) {
  return useQuery({
    queryKey: ['consentRecords', id],
    queryFn: () => fetchConsentRecord(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
