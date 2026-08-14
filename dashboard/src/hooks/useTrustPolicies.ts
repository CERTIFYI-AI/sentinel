// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hooks for Runtime Trust policies and the live-trace KPI
// aggregate. Reads are cached and shared; mutations invalidate the list so
// the UI reflects the real backend. Services throw — callers show real error
// toasts instead of false successes.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchTrustPolicies, upsertTrustPolicy, deleteTrustPolicy, fetchTraceAnalytics,
  type TrustPolicy, type TraceAnalytics,
} from '@/services/trustPolicyService'

export function useTrustPolicies() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['trust-policies'], queryFn: fetchTrustPolicies, staleTime: 20_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['trust-policies'] })
  const save = useMutation({ mutationFn: (p: Partial<TrustPolicy>) => upsertTrustPolicy(p), onSuccess: inv })
  const remove = useMutation({ mutationFn: (id: string) => deleteTrustPolicy(id), onSuccess: inv })
  return { data: list.data ?? [], isLoading: list.isLoading, error: list.error as Error | null, save, remove }
}

export function useTraceAnalytics(modelId?: string | null) {
  const q = useQuery<TraceAnalytics>({
    queryKey: ['trust-trace-analytics', modelId ?? 'all'],
    queryFn: () => fetchTraceAnalytics(modelId ?? undefined),
    staleTime: 30_000,
  })
  return { analytics: q.data ?? null, isLoading: q.isLoading, error: q.error as Error | null }
}
