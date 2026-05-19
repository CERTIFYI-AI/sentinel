// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllRisks, upsertRisk, deleteRisk } from '@/services/riskService'
import { toast } from 'sonner'

export function useRisksData(filters = {}) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['risk-register', filters],
    queryFn: () => fetchAllRisks(filters),
    staleTime: 30_000,
  })
  const saveMutation = useMutation({
    mutationFn: (risk: any) => upsertRisk(risk),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risk-register'] }); toast.success('Risk saved') },
    onError: () => toast.error('Failed to save risk'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRisk(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risk-register'] }); toast.success('Risk deleted') },
    onError: () => toast.error('Failed to delete risk'),
  })
  return { risks: query.data ?? [], isLoading: query.isLoading, error: query.error, saveRisk: saveMutation.mutateAsync, removeRisk: deleteMutation.mutateAsync }
}
