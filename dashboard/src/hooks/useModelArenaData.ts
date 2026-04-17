import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllModelArena, fetchModelArenaById, upsertModelArena, deleteModelArena } from '@/services/modelArenaService'
import { toast } from 'sonner'

export function useModelArenaData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['modelArena', filters],
    queryFn: () => fetchAllModelArena(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertModelArena(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['modelArena'] }); toast.success('Arena Run saved') },
    onError: () => toast.error('Failed to save arena run'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteModelArena(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['modelArena'] }); toast.success('Arena Run deleted') },
    onError: () => toast.error('Failed to delete arena run'),
  })

  return {
    items, isLoading, error,
    saveModelArena: saveMutation.mutateAsync,
    removeModelArena: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useModelArenaById(id: string) {
  return useQuery({
    queryKey: ['modelArena', id],
    queryFn: () => fetchModelArenaById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
