// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllEvalRuns, upsertEvalRun, deleteEvalRun } from '../../services/evalRunsService'
import { toast } from 'sonner'

const QUERY_KEY = ['eval-runs']

export function useEvalRuns() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllEvalRuns(),
    staleTime: 30_000,
  })
}

export function useUpsertEvalRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertEvalRun(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteEvalRun() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEvalRun(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
