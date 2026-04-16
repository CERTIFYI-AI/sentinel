import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { MODELS } from '../../data/seed'
import type { Model } from '../../data/seed'
import { fetchAllModels, upsertModel, deleteModel } from '../../services/modelService'

const QUERY_KEY = ['models']

export function useModels() {
  return useQuery<Model[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await fetchAllModels()
      return result && result.length > 0 ? result : MODELS
    },
    staleTime: 30_000,
    placeholderData: MODELS,
  })
}

export function useUpsertModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: Partial<Model>) => upsertModel(record as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteModel(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
