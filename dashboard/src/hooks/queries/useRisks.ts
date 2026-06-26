import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllRisks, upsertRisk, deleteRisk } from '../../services/riskService'
import { toast } from 'sonner'

const QUERY_KEY = ['risks']

export function useRisks() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllRisks(),
    staleTime: 30_000,
  })
}

export function useUpsertRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertRisk(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Risk saved') },
    onError: () => toast.error('Failed to save risk'),
  })
}

export function useDeleteRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteRisk(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
