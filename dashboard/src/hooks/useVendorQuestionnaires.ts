// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// React Query wrappers over vendorQuestionnaireService.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchVendorQuestionnaires, submitVendorQuestionnaire,
  reviewVendorQuestionnaire, deleteVendorQuestionnaire,
  type QuestionnaireDecision,
} from '@/services/vendorQuestionnaireService'

export function useVendorQuestionnaires(vendorId?: string) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: ['vendor-questionnaires', vendorId ?? 'all'],
    queryFn: () => fetchVendorQuestionnaires(vendorId),
    staleTime: 30_000,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor-questionnaires'] })
  const fail = (fallback: string) => (e: unknown) =>
    toast.error(e instanceof Error ? e.message : fallback)

  const submit = useMutation({
    mutationFn: (p: Parameters<typeof submitVendorQuestionnaire>[0]) => submitVendorQuestionnaire(p),
    onSuccess: () => { invalidate(); toast.success('Questionnaire submitted') },
    onError: fail('Failed to submit questionnaire'),
  })

  const review = useMutation({
    mutationFn: (p: { id: string; decision: QuestionnaireDecision; reviewer: string; assessmentId?: string }) =>
      reviewVendorQuestionnaire(p),
    onSuccess: (saved) => {
      invalidate()
      toast.success(`Decision recorded: ${(saved.reviewDecision ?? '').replace(/_/g, ' ')}`)
    },
    onError: fail('Failed to record decision'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteVendorQuestionnaire(id),
    onSuccess: () => { invalidate(); toast.success('Questionnaire deleted') },
    onError: fail('Failed to delete questionnaire'),
  })

  return {
    questionnaires: list.data ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error as Error | null,
    refetch: list.refetch,
    submit, review, remove,
  }
}
