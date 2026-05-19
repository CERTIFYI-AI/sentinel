import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllBcpPlans, fetchBcpPlansById, upsertBcpPlans, deleteBcpPlans } from '@/services/bcpPlansService'
import { toast } from 'sonner'

export function useBcpPlansData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['bcpPlans', filters],
    queryFn: () => fetchAllBcpPlans(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertBcpPlans(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bcpPlans'] }); toast.success('Plan saved') },
    onError: () => toast.error('Failed to save plan'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBcpPlans(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['bcpPlans'] }); toast.success('Plan deleted') },
    onError: () => toast.error('Failed to delete plan'),
  })

  return {
    items, isLoading, error,
    saveBcpPlans: saveMutation.mutateAsync,
    removeBcpPlans: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useBcpPlansById(id: string) {
  return useQuery({
    queryKey: ['bcpPlans', id],
    queryFn: () => fetchBcpPlansById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
