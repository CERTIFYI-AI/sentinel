import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTrustTraces, upsertTrustTrace, deleteTrustTrace } from '../services/trustTraceService'
import { toast } from 'sonner'

export function useTrustTraceData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['trustTraces', filters],
    queryFn: () => fetchTrustTraces(),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertTrustTrace(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trustTraces'] }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTrustTrace(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['trustTraces'] }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
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

// Legacy hooks for backward compatibility
export function useTrustTraces() {
  return useQuery({
    queryKey: ['trustTraces'],
    queryFn: () => fetchTrustTraces(),
    staleTime: 30_000,
  })
}

export function useUpsertTrustTrace() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertTrustTrace, onSuccess: () => qc.invalidateQueries({ queryKey: ['trustTraces'] }) })
}

export function useDeleteTrustTrace() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteTrustTrace, onSuccess: () => qc.invalidateQueries({ queryKey: ['trustTraces'] }) })
}
