import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchBiasAudits, upsertBiasAudit, deleteBiasAudit } from '../services/biasAuditService'
import { BIAS_AUDITS } from '../data/seed'
export function useBiasAudits() {
  return useQuery({ queryKey: ['bias_audits'], queryFn: async () => { const rows = await fetchBiasAudits(); return rows.length > 0 ? rows : BIAS_AUDITS }, staleTime: 30_000 })
}
export function useUpsertBiasAudit() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertBiasAudit, onSuccess: () => qc.invalidateQueries({ queryKey: ['bias_audits'] }) })
}
export function useDeleteBiasAudit() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteBiasAudit, onSuccess: () => qc.invalidateQueries({ queryKey: ['bias_audits'] }) })
}
