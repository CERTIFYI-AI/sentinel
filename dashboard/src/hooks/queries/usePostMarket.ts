// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllPostMarkets, upsertPostMarket, deletePostMarket } from '../../services/postMarketService'
import { toast } from 'sonner'

const QUERY_KEY = ['post-market-surveillance']

export function usePostMarket() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllPostMarkets(),
    staleTime: 30_000,
  })
}

export function useUpsertPostMarket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertPostMarket(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeletePostMarket() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePostMarket(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
