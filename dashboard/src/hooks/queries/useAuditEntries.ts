import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllAuditEntrys, upsertAuditEntry, deleteAuditEntry } from '../../services/auditLogService'
import { toast } from 'sonner'

const QUERY_KEY = ['audit_log']

export function useAuditEntries() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllAuditEntrys(),
    staleTime: 30_000,
  })
}

export function useUpsertAuditEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertAuditEntry(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteAuditEntry() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAuditEntry(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
