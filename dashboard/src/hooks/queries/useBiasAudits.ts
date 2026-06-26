import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllBiasAudits, upsertBiasAudit, deleteBiasAudit } from '../../services/biasAuditService'
import { toast } from 'sonner'

const QUERY_KEY = ['bias_audits']

export function useBiasAudits() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllBiasAudits(),
    staleTime: 30_000,
  })
}

export function useUpsertBiasAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertBiasAudit(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Bias audit saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteBiasAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBiasAudit(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
