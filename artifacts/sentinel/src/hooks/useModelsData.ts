// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllModels, upsertModel, deleteModel } from '@/services/modelService'
import { toast } from 'sonner'

export function useModelsData(filters = {}) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['ai-models', filters],
    queryFn: () => fetchAllModels(filters),
    staleTime: 30_000,
  })
  const saveMutation = useMutation({
    mutationFn: (model: any) => upsertModel(model),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-models'] }); toast.success('Model saved') },
    onError: () => toast.error('Failed to save model'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteModel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-models'] }); toast.success('Model deleted') },
    onError: () => toast.error('Failed to delete model'),
  })
  return { models: query.data ?? [], isLoading: query.isLoading, error: query.error, saveModel: saveMutation.mutateAsync, deleteModel: deleteMutation.mutateAsync }
}
