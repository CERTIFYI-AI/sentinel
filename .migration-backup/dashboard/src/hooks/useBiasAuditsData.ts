import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllBiasAudits, fetchBiasAuditsById, upsertBiasAudits, deleteBiasAudits } from '@/services/biasAuditsService'
import { toast } from 'sonner'

export function useBiasAuditsData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['biasAudits', filters],
    queryFn: () => fetchAllBiasAudits(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertBiasAudits(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['biasAudits'] }); toast.success('Audit saved') },
    onError: () => toast.error('Failed to save audit'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBiasAudits(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['biasAudits'] }); toast.success('Audit deleted') },
    onError: () => toast.error('Failed to delete audit'),
  })

  return {
    items, isLoading, error,
    saveBiasAudits: saveMutation.mutateAsync,
    removeBiasAudits: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useBiasAuditsById(id: string) {
  return useQuery({
    queryKey: ['biasAudits', id],
    queryFn: () => fetchBiasAuditsById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
