// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllDatasets, upsertDataset, deleteDataset } from '../../services/datasetService'
import { toast } from 'sonner'

const QUERY_KEY = ['datasets']

export function useDatasets() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllDatasets(),
    staleTime: 30_000,
  })
}

export function useUpsertDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertDataset(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Dataset saved') },
    onError: () => toast.error('Failed to save dataset'),
  })
}

export function useDeleteDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDataset(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
