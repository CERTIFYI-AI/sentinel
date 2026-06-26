// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchNotifications, upsertNotification, deleteNotification } from '../services/notificationService'
import { NOTIFICATIONS } from '../data/seed'
import { toast } from 'sonner'

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

// Standard hook pattern alias used by pages
export function useNotificationData() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const rows = await fetchNotifications()
      return rows.length > 0 ? rows : NOTIFICATIONS
    },
    staleTime: 30_000,
  })
  const saveMutation = useMutation({
    mutationFn: upsertNotification,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
  const deleteMutation = useMutation({
    mutationFn: deleteNotification,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notifications'] }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  }
}
