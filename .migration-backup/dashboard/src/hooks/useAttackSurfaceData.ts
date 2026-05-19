import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllAttackSurface, fetchAttackSurfaceById, upsertAttackSurface, deleteAttackSurface } from '@/services/attackSurfaceService'
import { toast } from 'sonner'

export function useAttackSurfaceData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['attackSurface', filters],
    queryFn: () => fetchAllAttackSurface(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertAttackSurface(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attackSurface'] }); toast.success('Asset saved') },
    onError: () => toast.error('Failed to save asset'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAttackSurface(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attackSurface'] }); toast.success('Asset deleted') },
    onError: () => toast.error('Failed to delete asset'),
  })

  return {
    items, isLoading, error,
    saveAttackSurface: saveMutation.mutateAsync,
    removeAttackSurface: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useAttackSurfaceById(id: string) {
  return useQuery({
    queryKey: ['attackSurface', id],
    queryFn: () => fetchAttackSurfaceById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
