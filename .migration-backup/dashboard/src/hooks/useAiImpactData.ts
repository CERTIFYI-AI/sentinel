import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllAiImpact, fetchAiImpactById, upsertAiImpact, deleteAiImpact } from '@/services/aiImpactService'
import { toast } from 'sonner'

export function useAiImpactData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['aiImpact', filters],
    queryFn: () => fetchAllAiImpact(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertAiImpact(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['aiImpact'] }); toast.success('Assessment saved') },
    onError: () => toast.error('Failed to save assessment'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAiImpact(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['aiImpact'] }); toast.success('Assessment deleted') },
    onError: () => toast.error('Failed to delete assessment'),
  })

  return {
    items, isLoading, error,
    saveAiImpact: saveMutation.mutateAsync,
    removeAiImpact: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useAiImpactById(id: string) {
  return useQuery({
    queryKey: ['aiImpact', id],
    queryFn: () => fetchAiImpactById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
