// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllToolCallLogs, upsertToolCallLog, deleteToolCallLog } from '../../services/toolCallLogsService'
import { toast } from 'sonner'

const QUERY_KEY = ['tool-call-logs']

export function useToolCallLogs() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllToolCallLogs(),
    staleTime: 30_000,
  })
}

export function useUpsertToolCallLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertToolCallLog(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteToolCallLog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteToolCallLog(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
