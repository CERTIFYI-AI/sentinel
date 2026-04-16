import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchTasks, upsertTask, deleteTask } from '../services/taskService'
import { TASKS } from '../data/seed'
export function useTasks() {
  return useQuery({ queryKey: ['tasks'], queryFn: async () => { const rows = await fetchTasks(); return rows.length > 0 ? rows : TASKS }, staleTime: 30_000 })
}
export function useUpsertTask() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertTask, onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }) })
}
export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteTask, onSuccess: () => qc.invalidateQueries({ queryKey: ['tasks'] }) })
}
