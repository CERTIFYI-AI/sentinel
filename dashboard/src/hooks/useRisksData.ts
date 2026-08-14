import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllRisks, upsertRisk, deleteRisk, type RiskRecord } from '@/services/riskService'
import { toast } from 'sonner'

export type { RiskRecord }

export function useRisksData(filters = {}) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['risks', filters],
    queryFn: () => fetchAllRisks(filters),
    staleTime: 30_000,
  })
  const saveMutation = useMutation({
    mutationFn: (risk: Partial<RiskRecord>) => upsertRisk(risk),
    // Service writes throw — success fires only after the write resolved.
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks'] }); toast.success('Risk saved') },
    onError: (e: Error) => toast.error(`Failed to save risk: ${e.message}`),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRisk(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['risks'] }); toast.success('Risk deleted') },
    onError: (e: Error) => toast.error(`Failed to delete risk: ${e.message}`),
  })
  return {
    risks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    saveRisk: saveMutation.mutateAsync,
    removeRisk: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  }
}
