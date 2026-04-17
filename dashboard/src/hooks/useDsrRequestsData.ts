import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllDsrRequests, fetchDsrRequestsById, upsertDsrRequests, deleteDsrRequests } from '@/services/dsrRequestsService'
import { toast } from 'sonner'

export function useDsrRequestsData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['dsrRequests', filters],
    queryFn: () => fetchAllDsrRequests(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertDsrRequests(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dsrRequests'] }); toast.success('Request saved') },
    onError: () => toast.error('Failed to save request'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDsrRequests(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dsrRequests'] }); toast.success('Request deleted') },
    onError: () => toast.error('Failed to delete request'),
  })

  return {
    items, isLoading, error,
    saveDsrRequests: saveMutation.mutateAsync,
    removeDsrRequests: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useDsrRequestsById(id: string) {
  return useQuery({
    queryKey: ['dsrRequests', id],
    queryFn: () => fetchDsrRequestsById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
