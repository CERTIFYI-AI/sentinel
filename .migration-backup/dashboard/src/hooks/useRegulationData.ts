import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchRegulations, upsertRegulation, deleteRegulation } from '../services/regulationService'
import { REGULATIONS } from '../data/seed'
export function useRegulations() {
  return useQuery({ queryKey: ['regulations'], queryFn: async () => { const rows = await fetchRegulations(); return rows.length > 0 ? rows : REGULATIONS }, staleTime: 30_000 })
}
export function useUpsertRegulation() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertRegulation, onSuccess: () => qc.invalidateQueries({ queryKey: ['regulations'] }) })
}
export function useDeleteRegulation() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteRegulation, onSuccess: () => qc.invalidateQueries({ queryKey: ['regulations'] }) })
}
