// @ts-nocheck
import { useQuery } from '@tanstack/react-query'
import { fetchAuditLogs } from '@/services/auditLogService'

export function useAuditLogData(limit = 100) {
  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['audit-logs', limit],
    queryFn: () => fetchAuditLogs(limit),
    staleTime: 15_000,
  })
  return { logs, isLoading, error }
}
