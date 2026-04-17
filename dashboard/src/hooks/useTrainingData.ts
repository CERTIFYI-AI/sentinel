import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllTraining, fetchTrainingById, upsertTraining, deleteTraining } from '@/services/trainingService'
import { toast } from 'sonner'

export function useTrainingData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['training', filters],
    queryFn: () => fetchAllTraining(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertTraining(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training'] }); toast.success('Course saved') },
    onError: () => toast.error('Failed to save course'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTraining(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['training'] }); toast.success('Course deleted') },
    onError: () => toast.error('Failed to delete course'),
  })

  return {
    items, isLoading, error,
    saveTraining: saveMutation.mutateAsync,
    removeTraining: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useTrainingById(id: string) {
  return useQuery({
    queryKey: ['training', id],
    queryFn: () => fetchTrainingById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
