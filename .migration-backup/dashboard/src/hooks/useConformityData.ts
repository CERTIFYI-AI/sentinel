import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllConformity, fetchConformityById, upsertConformity, deleteConformity } from '@/services/conformityService'
import { toast } from 'sonner'

export function useConformityData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['conformity', filters],
    queryFn: () => fetchAllConformity(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertConformity(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['conformity'] }); toast.success('Assessment saved') },
    onError: () => toast.error('Failed to save assessment'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConformity(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['conformity'] }); toast.success('Assessment deleted') },
    onError: () => toast.error('Failed to delete assessment'),
  })

  return {
    items, isLoading, error,
    saveConformity: saveMutation.mutateAsync,
    removeConformity: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useConformityById(id: string) {
  return useQuery({
    queryKey: ['conformity', id],
    queryFn: () => fetchConformityById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
