// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllModelPerformances, upsertModelPerformance, deleteModelPerformance } from '../../services/modelPerformanceService'
import { toast } from 'sonner'

const QUERY_KEY = ['model-performance-metrics']

export function useModelPerformance() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllModelPerformances(),
    staleTime: 30_000,
  })
}

export function useUpsertModelPerformance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertModelPerformance(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteModelPerformance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteModelPerformance(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
