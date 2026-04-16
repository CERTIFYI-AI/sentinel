import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchModels, upsertModel, deleteModel, ModelRecord } from '@/services/modelService'
import { toast } from 'sonner'

export function useModelsData() {
  const qc = useQueryClient()
  const { data: models = [], isLoading, error } = useQuery({
    queryKey: ['models'],
    queryFn: fetchModels,
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (model: Partial<ModelRecord>) => upsertModel(model),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['models'] }); toast.success('Model saved') },
    onError: () => toast.error('Failed to save model'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteModel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['models'] }); toast.success('Model deleted') },
    onError: () => toast.error('Failed to delete model'),
  })

  return { models, isLoading, error, saveModel: saveMutation.mutateAsync, deleteModel: deleteMutation.mutateAsync }
}
