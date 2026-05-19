import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllMaturity, fetchMaturityById, upsertMaturity, deleteMaturity } from '@/services/maturityService'
import { toast } from 'sonner'

export function useMaturityData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['maturity', filters],
    queryFn: () => fetchAllMaturity(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertMaturity(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maturity'] }); toast.success('Assessment saved') },
    onError: () => toast.error('Failed to save assessment'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMaturity(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['maturity'] }); toast.success('Assessment deleted') },
    onError: () => toast.error('Failed to delete assessment'),
  })

  return {
    items, isLoading, error,
    saveMaturity: saveMutation.mutateAsync,
    removeMaturity: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useMaturityById(id: string) {
  return useQuery({
    queryKey: ['maturity', id],
    queryFn: () => fetchMaturityById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
