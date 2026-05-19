// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchControls, upsertControl, deleteControl } from '../services/controlService'
import { toast } from 'sonner'

// Legacy exports for backward compat
export function useControls() {
  return useQuery({ queryKey: ['controls'], queryFn: fetchControls, staleTime: 30_000 })
}
export function useUpsertControl() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertControl, onSuccess: () => qc.invalidateQueries({ queryKey: ['controls'] }) })
}
export function useDeleteControl() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteControl, onSuccess: () => qc.invalidateQueries({ queryKey: ['controls'] }) })
}

// Standard hook
export function useControlData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['controls', filters],
    queryFn: () => fetchControls(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertControl(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['controls'] }); toast.success('Control saved') },
    onError: () => toast.error('Failed to save control'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteControl(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['controls'] }); toast.success('Control deleted') },
    onError: () => toast.error('Failed to delete control'),
  })

  return {
    controls: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
