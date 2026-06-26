import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllEvidences, upsertEvidence, deleteEvidence } from '../../services/evidenceService'
import { toast } from 'sonner'

const QUERY_KEY = ['evidence']

export function useEvidence() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllEvidences(),
    staleTime: 30_000,
  })
}

export function useUpsertEvidence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertEvidence(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Evidence saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteEvidence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEvidence(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
