// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllMRCVotes, upsertMRCVote, deleteMRCVote } from '../../services/mrcVotesService'
import { toast } from 'sonner'

const QUERY_KEY = ['mrc-votes']

export function useMRCVotes() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllMRCVotes(),
    staleTime: 30_000,
  })
}

export function useUpsertMRCVote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertMRCVote(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteMRCVote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteMRCVote(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
