import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllRemediation, fetchRemediationById, upsertRemediation, deleteRemediation } from '@/services/remediationService'
import { toast } from 'sonner'

export function useRemediationData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['remediation', filters],
    queryFn: () => fetchAllRemediation(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertRemediation(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remediation'] }); toast.success('Plan saved') },
    onError: () => toast.error('Failed to save plan'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRemediation(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['remediation'] }); toast.success('Plan deleted') },
    onError: () => toast.error('Failed to delete plan'),
  })

  return {
    items, isLoading, error,
    saveRemediation: saveMutation.mutateAsync,
    removeRemediation: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useRemediationById(id: string) {
  return useQuery({
    queryKey: ['remediation', id],
    queryFn: () => fetchRemediationById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
