// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTrustTraces, upsertTrustTrace, deleteTrustTrace } from '../services/trustTraceService'
import { TRUST_TRACES } from '../data/seed'
export function useTrustTraces() {
  return useQuery({ queryKey: ['trust_traces'], queryFn: async () => { const rows = await fetchTrustTraces(); return rows.length > 0 ? rows : TRUST_TRACES }, staleTime: 30_000 })
}
export function useUpsertTrustTrace() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertTrustTrace, onSuccess: () => qc.invalidateQueries({ queryKey: ['trust_traces'] }) })
}
export function useDeleteTrustTrace() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteTrustTrace, onSuccess: () => qc.invalidateQueries({ queryKey: ['trust_traces'] }) })
}
