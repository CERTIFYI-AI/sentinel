import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllModels, upsertModel, deleteModel } from '../../services/modelService'
import { toast } from 'sonner'

const QUERY_KEY = ['models']

export function useModels() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllModels(),
    staleTime: 30_000,
  })
}

export function useUpsertModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertModel(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Model saved') },
    onError: () => toast.error('Failed to save model'),
  })
}

export function useDeleteModel() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteModel(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
