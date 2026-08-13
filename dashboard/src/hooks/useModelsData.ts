import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllModels, upsertModel, deleteModel, type ModelRecord } from '@/services/modelService'

// Success/error toasts are owned by the page (ModelRegistryPage) so a single,
// context-rich notification fires per action — the hook only keeps the cache fresh.
export function useModelsData(filters = {}) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['ai-models', filters],
    queryFn: () => fetchAllModels(filters),
    staleTime: 30_000,
  })
  const saveMutation = useMutation({
    mutationFn: (model: Partial<ModelRecord>) => upsertModel(model),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-models'] }) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteModel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ai-models'] }) },
  })
  return { models: query.data ?? [], isLoading: query.isLoading, error: query.error, saveModel: saveMutation.mutateAsync, deleteModel: deleteMutation.mutateAsync }
}
