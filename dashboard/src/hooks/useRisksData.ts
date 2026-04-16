import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchRisks, upsertRisk, deleteRisk } from '@/services/riskService'
import { toast } from 'sonner'

export function useRisksData() {
  const qc = useQueryClient()
  const { data: risks = [], isLoading, error } = useQuery({
    queryKey: ['risks'],
    queryFn: fetchRisks,
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (risk: any) => upsertRisk(risk),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks'] }); toast.success('Risk saved') },
    onError: () => toast.error('Failed to save risk'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRisk(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks'] }); toast.success('Risk deleted') },
    onError: () => toast.error('Failed to delete risk'),
  })

  return { risks, isLoading, error, saveRisk: saveMutation.mutateAsync, removeRisk: deleteMutation.mutateAsync }
}
