// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllFallbackLogs, upsertFallbackLog, deleteFallbackLog } from '../../services/fallbackLogsService'
import { toast } from 'sonner'

const QUERY_KEY = ['fallback-logs']

export function useFallbackLogs() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllFallbackLogs(),
    staleTime: 30_000,
  })
}

export function useUpsertFallbackLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertFallbackLog(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteFallbackLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteFallbackLog(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
