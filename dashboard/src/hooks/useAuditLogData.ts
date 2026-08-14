import { useQuery } from '@tanstack/react-query'
import { fetchAuditLogs, type AuditLogRecord, type AuditLogFilters } from '@/services/auditLogService'

export type { AuditLogRecord, AuditLogFilters }

// queryKey starts with 'audit-log' so the global Realtime invalidation
// (useRealtimeInvalidation, mounted in App) refreshes this query on every
// audit_log insert — the trail is live without page-level subscriptions.
export function useAuditLogData(limit = 500, filters: AuditLogFilters = {}) {
  const { data: logs = [], isLoading, error } = useQuery({
    queryKey: ['audit-log', limit, filters],
    queryFn: () => fetchAuditLogs(limit, filters),
    staleTime: 15_000,
  })
  return { logs, isLoading, error }
}
