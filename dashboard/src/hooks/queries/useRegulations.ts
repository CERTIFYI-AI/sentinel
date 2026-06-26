import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllRegulations, upsertRegulation, deleteRegulation } from '../../services/regulationService'
import { toast } from 'sonner'

const QUERY_KEY = ['regulations']

export function useRegulations() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllRegulations(),
    staleTime: 30_000,
  })
}

export function useUpsertRegulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertRegulation(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Regulation saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteRegulation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteRegulation(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
