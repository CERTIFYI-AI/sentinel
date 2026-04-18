import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllExplainability, fetchExplainabilityById, upsertExplainability, deleteExplainability } from '@/services/explainabilityService'
import { toast } from 'sonner'

export function useExplainabilityData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['explainability', filters],
    queryFn: () => fetchAllExplainability(),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertExplainability(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['explainability'] }); toast.success('Report saved') },
    onError: () => toast.error('Failed to save report'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteExplainability(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['explainability'] }); toast.success('Report deleted') },
    onError: () => toast.error('Failed to delete report'),
  })

  return {
    items, isLoading, error,
    saveExplainability: saveMutation.mutateAsync,
    removeExplainability: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useExplainabilityById(id: string) {
  return useQuery({
    queryKey: ['explainability', id],
    queryFn: () => fetchExplainabilityById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
