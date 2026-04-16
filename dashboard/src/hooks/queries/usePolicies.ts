import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { POLICIES } from '../../data/seed'
import type { Policy } from '../../data/seed'
import { fetchAllPolicys, upsertPolicy, deletePolicy } from '../../services/policyService'

const QUERY_KEY = ['policies']

export function usePolicies() {
  return useQuery<Policy[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await fetchAllPolicys()
      return result && result.length > 0 ? result : POLICIES
    },
    staleTime: 30_000,
    placeholderData: POLICIES,
  })
}

export function useUpsertPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: Partial<Policy>) => upsertPolicy(record as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeletePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePolicy(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
