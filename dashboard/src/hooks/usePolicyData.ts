import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPolicys, upsertPolicy, deletePolicy } from '../services/policyService'
import { POLICIES } from '../data/seed'
export function usePolicys() {
  return useQuery({ queryKey: ['policies'], queryFn: async () => { const rows = await fetchPolicys(); return rows.length > 0 ? rows : POLICIES }, staleTime: 30_000 })
}
export function useUpsertPolicy() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertPolicy, onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }) })
}
export function useDeletePolicy() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deletePolicy, onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }) })
}
