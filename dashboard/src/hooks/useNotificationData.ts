import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchNotifications, upsertNotification, deleteNotification } from '../services/notificationService'
import { NOTIFICATIONS } from '../data/seed'
export function useNotifications() {
  return useQuery({ queryKey: ['notifications'], queryFn: async () => { const rows = await fetchNotifications(); return rows.length > 0 ? rows : NOTIFICATIONS }, staleTime: 30_000 })
}
export function useUpsertNotification() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertNotification, onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) })
}
export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteNotification, onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }) })
}
