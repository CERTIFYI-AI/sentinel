import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { BIAS_AUDITS } from '../../data/seed'
import type { BiasAudit } from '../../data/seed'
import { fetchAllBiasAudits, upsertBiasAudit, deleteBiasAudit } from '../../services/biasAuditService'

const QUERY_KEY = ['bias_audits']

export function useBiasAudits() {
  return useQuery<BiasAudit[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await fetchAllBiasAudits()
      return result && result.length > 0 ? result : BIAS_AUDITS
    },
    staleTime: 30_000,
    placeholderData: BIAS_AUDITS,
  })
}

export function useUpsertBiasAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: Partial<BiasAudit>) => upsertBiasAudit(record as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteBiasAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBiasAudit(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
