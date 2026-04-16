import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AUDIT_LOG } from '../../data/seed'
import type { AuditEntry } from '../../data/seed'
import { fetchAllAuditEntrys, upsertAuditEntry, deleteAuditEntry } from '../../services/auditLogService'

const QUERY_KEY = ['audit_log']

export function useAuditEntries() {
  return useQuery<AuditEntry[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await fetchAllAuditEntrys()
      return result && result.length > 0 ? result : AUDIT_LOG
    },
    staleTime: 30_000,
    placeholderData: AUDIT_LOG,
  })
}

export function useUpsertAuditEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: Partial<AuditEntry>) => upsertAuditEntry(record as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteAuditEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAuditEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
