import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { REGULATIONS } from '../../data/seed'
import type { Regulation } from '../../data/seed'
import { fetchAllRegulations, upsertRegulation, deleteRegulation } from '../../services/regulationService'

const QUERY_KEY = ['regulations']

export function useRegulations() {
  return useQuery<Regulation[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await fetchAllRegulations()
      return result && result.length > 0 ? result : REGULATIONS
    },
    staleTime: 30_000,
    placeholderData: REGULATIONS,
  })
}

export function useUpsertRegulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: Partial<Regulation>) => upsertRegulation(record as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteRegulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteRegulation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
