import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllEnergyMetrics, upsertEnergyMetric, deleteEnergyMetric } from '@/services/energyService'
import { toast } from 'sonner'

export function useEnergyData(filters = {}) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['energy-metrics', filters],
    queryFn: () => fetchAllEnergyMetrics(filters),
    staleTime: 30_000,
  })
  const saveMutation = useMutation({
    mutationFn: (r: any) => upsertEnergyMetric(r),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['energy-metrics'] }); toast.success('Energy metric saved') },
    onError: () => toast.error('Failed to save energy metric'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEnergyMetric(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['energy-metrics'] }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
  return {
    metrics: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  }
}
