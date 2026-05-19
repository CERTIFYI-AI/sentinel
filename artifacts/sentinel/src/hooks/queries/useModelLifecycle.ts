// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllModelLifecycles, upsertModelLifecycle, deleteModelLifecycle } from '../../services/modelLifecycleService'
import { toast } from 'sonner'

const QUERY_KEY = ['model-lifecycle-stages']

export function useModelLifecycle() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllModelLifecycles(),
    staleTime: 30_000,
  })
}

export function useUpsertModelLifecycle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertModelLifecycle(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteModelLifecycle() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteModelLifecycle(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
