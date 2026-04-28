// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllAIRiskTiers, upsertAIRiskTier, deleteAIRiskTier } from '../../services/aiRiskTieringService'
import { toast } from 'sonner'

const QUERY_KEY = ['ai-risk-tiering']

export function useAIRiskTiering() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllAIRiskTiers(),
    staleTime: 30_000,
  })
}

export function useUpsertAIRiskTier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertAIRiskTier(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteAIRiskTier() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAIRiskTier(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
