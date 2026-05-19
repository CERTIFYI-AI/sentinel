import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllExceptions, fetchExceptionsById, upsertExceptions, deleteExceptions } from '@/services/exceptionsService'
import { toast } from 'sonner'

export function useExceptionsData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['exceptions', filters],
    queryFn: () => fetchAllExceptions(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertExceptions(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exceptions'] }); toast.success('Exception saved') },
    onError: () => toast.error('Failed to save exception'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExceptions(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['exceptions'] }); toast.success('Exception deleted') },
    onError: () => toast.error('Failed to delete exception'),
  })

  return {
    items, isLoading, error,
    saveExceptions: saveMutation.mutateAsync,
    removeExceptions: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useExceptionsById(id: string) {
  return useQuery({
    queryKey: ['exceptions', id],
    queryFn: () => fetchExceptionsById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
