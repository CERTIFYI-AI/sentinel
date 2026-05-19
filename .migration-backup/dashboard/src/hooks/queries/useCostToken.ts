// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllCostTokens, upsertCostToken, deleteCostToken } from '../../services/costTokenService'
import { toast } from 'sonner'

const QUERY_KEY = ['cost-token-usage']

export function useCostToken() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllCostTokens(),
    staleTime: 30_000,
  })
}

export function useUpsertCostToken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertCostToken(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteCostToken() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCostToken(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
