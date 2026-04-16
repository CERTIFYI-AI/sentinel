import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RISKS } from '../../data/seed'
import type { Risk } from '../../data/seed'
import { fetchAllRisks, upsertRisk, deleteRisk } from '../../services/riskService'

const QUERY_KEY = ['risks']

export function useRisks() {
  return useQuery<Risk[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await fetchAllRisks()
      return result && result.length > 0 ? result : RISKS
    },
    staleTime: 30_000,
    placeholderData: RISKS,
  })
}

export function useUpsertRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: Partial<Risk>) => upsertRisk(record as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteRisk(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
