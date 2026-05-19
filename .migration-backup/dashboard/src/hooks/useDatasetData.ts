// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllDatasets, upsertDataset, deleteDataset } from '@/services/datasetService'
import { toast } from 'sonner'

export function useDatasetData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['datasets', filters],
    queryFn: () => fetchAllDatasets(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertDataset(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['datasets'] }); toast.success('Dataset saved') },
    onError: () => toast.error('Failed to save dataset'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDataset(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['datasets'] }); toast.success('Dataset deleted') },
    onError: () => toast.error('Failed to delete dataset'),
  })

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
