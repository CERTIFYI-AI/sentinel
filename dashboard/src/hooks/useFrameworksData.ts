import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchFrameworks, upsertFramework, deleteFramework } from '@/services/frameworkService'
import { toast } from 'sonner'

export function useFrameworksData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['frameworks', filters],
    queryFn: () => fetchFrameworks(filters),
    staleTime: 60_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertFramework(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['frameworks'] }); toast.success('Framework saved') },
    onError: () => toast.error('Failed to save framework'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteFramework(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['frameworks'] }); toast.success('Framework deleted') },
    onError: () => toast.error('Failed to delete framework'),
  })

  return {
    frameworks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
