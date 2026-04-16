import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { TASKS } from '../../data/seed'
import type { Task } from '../../data/seed'
import { fetchAllTasks, upsertTask, deleteTask } from '../../services/taskService'

const QUERY_KEY = ['tasks']

export function useTasks() {
  return useQuery<Task[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await fetchAllTasks()
      return result && result.length > 0 ? result : TASKS
    },
    staleTime: 30_000,
    placeholderData: TASKS,
  })
}

export function useUpsertTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: Partial<Task>) => upsertTask(record as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteTask(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
