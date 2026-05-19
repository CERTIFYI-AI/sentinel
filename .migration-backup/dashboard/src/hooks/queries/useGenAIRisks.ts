// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllGenAIRisks, upsertGenAIRisk, deleteGenAIRisk } from '../../services/genaiRisksService'
import { toast } from 'sonner'

const QUERY_KEY = ['genai-risks']

export function useGenAIRisks() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllGenAIRisks(),
    staleTime: 30_000,
  })
}

export function useUpsertGenAIRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertGenAIRisk(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteGenAIRisk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteGenAIRisk(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
