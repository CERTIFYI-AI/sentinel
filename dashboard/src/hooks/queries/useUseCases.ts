// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllUseCases, upsertUseCase, deleteUseCase } from '../../services/useCasesService'
import { toast } from 'sonner'

const QUERY_KEY = ['use-cases']

export function useUseCases() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllUseCases(),
    staleTime: 30_000,
  })
}

export function useUpsertUseCase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertUseCase(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteUseCase() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteUseCase(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
