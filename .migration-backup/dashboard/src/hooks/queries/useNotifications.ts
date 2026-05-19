// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllNotifications, upsertNotification, deleteNotification } from '../../services/notificationService'
import { toast } from 'sonner'

const QUERY_KEY = ['notifications']

export function useNotifications() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllNotifications(),
    staleTime: 30_000,
  })
}

export function useUpsertNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertNotification(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Notification saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteNotification(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
