// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllTasks, upsertTask, deleteTask } from '../../services/taskService'
import { toast } from 'sonner'

const QUERY_KEY = ['tasks']

export function useTasks() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllTasks(),
    staleTime: 30_000,
  })
}

export function useUpsertTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertTask(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Task saved') },
    onError: () => toast.error('Failed to save task'),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
