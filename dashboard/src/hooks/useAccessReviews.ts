// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hook for Identity Governance access reviews. Mutations invalidate
// the list; the service throws on failure, so a success toast only fires after
// a real resolve.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAccessReviews, createAccessReview, updateAccessReview,
  recordReviewDecision, deleteAccessReview,
  type AccessReview, type ReviewDecision,
} from '@/services/accessReviewService'

const KEY = ['access-reviews']

export function useAccessReviews(filters: { modelId?: string } = {}) {
  const qc = useQueryClient()
  const list = useQuery({
    queryKey: [...KEY, filters.modelId ?? 'all'],
    queryFn: () => fetchAccessReviews(filters),
    staleTime: 20_000,
  })
  const invalidate = () => qc.invalidateQueries({ queryKey: KEY })

  const create = useMutation({
    mutationFn: (record: Partial<AccessReview>) => createAccessReview(record),
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<AccessReview> }) => updateAccessReview(id, patch),
    onSuccess: invalidate,
  })
  const decide = useMutation({
    mutationFn: ({ id, decision, notes }: { id: string; decision: Exclude<ReviewDecision, null>; notes?: string }) =>
      recordReviewDecision(id, decision, notes),
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteAccessReview(id),
    onSuccess: invalidate,
  })

  return {
    reviews: list.data ?? [],
    isLoading: list.isLoading,
    error: list.error as Error | null,
    refetch: list.refetch,
    create, update, decide, remove,
  }
}
