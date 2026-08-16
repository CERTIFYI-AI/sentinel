// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI. All rights reserved.
//
// React Query wrappers over vendorAssessmentService. Toasts fire only from
// onSuccess/onError of a mutation that actually resolved or rejected.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  fetchVendorAssessments, createVendorAssessment, updateVendorAssessment,
  decideVendorAssessment, deleteVendorAssessment,
  type VendorAssessmentRecord, type AssessmentStatus,
} from '@/services/vendorAssessmentService'

export function useVendorAssessments(vendorId?: string) {
  const qc = useQueryClient()
  const key = ['vendor-assessments', vendorId ?? 'all'] as const
  const list = useQuery({
    queryKey: key,
    queryFn: () => fetchVendorAssessments(vendorId),
    staleTime: 30_000,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: ['vendor-assessments'] })
  const fail = (fallback: string) => (e: unknown) =>
    toast.error(e instanceof Error ? e.message : fallback)

  const create = useMutation({
    mutationFn: (a: Partial<VendorAssessmentRecord>) => createVendorAssessment(a),
    onSuccess: () => { invalidate(); toast.success('Assessment created') },
    onError: fail('Failed to create assessment'),
  })

  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<VendorAssessmentRecord> }) =>
      updateVendorAssessment(id, patch),
    onSuccess: () => { invalidate(); toast.success('Assessment updated') },
    onError: fail('Failed to update assessment'),
  })

  const decide = useMutation({
    mutationFn: (p: {
      id: string
      decision: Extract<AssessmentStatus, 'approved' | 'approved_with_conditions' | 'rejected'>
      approver: string
      conditions?: string
      residualRisk?: string
      notes?: string
    }) => decideVendorAssessment(p),
    onSuccess: (saved) => { invalidate(); toast.success(`Decision recorded: ${saved.status.replace(/_/g, ' ')}`) },
    onError: fail('Failed to record decision'),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deleteVendorAssessment(id),
    onSuccess: () => { invalidate(); toast.success('Assessment deleted') },
    onError: fail('Failed to delete assessment'),
  })

  return {
    assessments: list.data ?? [],
    isLoading: list.isLoading,
    isError: list.isError,
    error: list.error as Error | null,
    refetch: list.refetch,
    create, update, decide, remove,
  }
}
