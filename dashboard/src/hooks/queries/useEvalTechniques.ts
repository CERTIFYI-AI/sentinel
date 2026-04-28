// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllEvalTechniques, upsertEvalTechnique, deleteEvalTechnique } from '../../services/evalTechniquesService'
import { toast } from 'sonner'

const QUERY_KEY = ['eval-techniques']

export function useEvalTechniques() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllEvalTechniques(),
    staleTime: 30_000,
  })
}

export function useUpsertEvalTechnique() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertEvalTechnique(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteEvalTechnique() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEvalTechnique(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
