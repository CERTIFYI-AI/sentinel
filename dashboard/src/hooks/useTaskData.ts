import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllTasks, upsertTask, deleteTask } from '@/services/taskService'
import { toast } from 'sonner'

export function useTaskData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['tasks', filters],
    queryFn: () => fetchAllTasks(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertTask(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task saved') },
    onError: () => toast.error('Failed to save task'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tasks'] }); toast.success('Task deleted') },
    onError: () => toast.error('Failed to delete task'),
  })

  return {
    tasks: query.data ?? [],
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
