import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchLifecycleModels, upsertLifecycleModel, deleteLifecycleModel,
  type LifecycleModel,
} from '@/services/lifecycleService'

export function useLifecycleData() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['model-lifecycle'],
    queryFn: fetchLifecycleModels,
    staleTime: 30_000,
  })
  const saveMutation = useMutation({
    mutationFn: (m: LifecycleModel) => upsertLifecycleModel(m),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['model-lifecycle'] }) },
  })
  const deleteMutation = useMutation({
    mutationFn: (rowId: string) => deleteLifecycleModel(rowId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['model-lifecycle'] }) },
  })
  return {
    models: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    saveModel: saveMutation.mutateAsync,
    deleteModel: deleteMutation.mutateAsync,
  }
}
