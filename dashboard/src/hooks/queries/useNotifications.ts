import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { NOTIFICATION_TEMPLATES as NOTIFICATIONS } from '../../data/seed'
import type { Notification } from '../../data/seed'
import { fetchAllNotifications, upsertNotification, deleteNotification } from '../../services/notificationService'

const QUERY_KEY = ['notifications']

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await fetchAllNotifications()
      return result && result.length > 0 ? result : NOTIFICATIONS
    },
    staleTime: 30_000,
    placeholderData: NOTIFICATIONS,
  })
}

export function useUpsertNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: Partial<Notification>) => upsertNotification(record as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
