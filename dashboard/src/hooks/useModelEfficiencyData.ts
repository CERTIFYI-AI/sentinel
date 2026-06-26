import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllModelEfficiency, upsertModelEfficiency, deleteModelEfficiency } from '@/services/modelEfficiencyService'
import { toast } from 'sonner'

export function useModelEfficiencyData(filters = {}) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['model-efficiency', filters],
    queryFn: () => fetchAllModelEfficiency(filters),
    staleTime: 30_000,
  })
  const saveMutation = useMutation({
    mutationFn: (r: any) => upsertModelEfficiency(r),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['model-efficiency'] }); toast.success('Model efficiency record saved') },
    onError: () => toast.error('Failed to save model efficiency record'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteModelEfficiency(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['model-efficiency'] }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
  return {
    records: query.data ?? [],
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  }
}
