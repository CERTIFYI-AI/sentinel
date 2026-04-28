// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllModelDNAs, upsertModelDNA, deleteModelDNA } from '../../services/modelDNAService'
import { toast } from 'sonner'

const QUERY_KEY = ['model-dna']

export function useModelDNA() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllModelDNAs(),
    staleTime: 30_000,
  })
}

export function useUpsertModelDNA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertModelDNA(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteModelDNA() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteModelDNA(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
