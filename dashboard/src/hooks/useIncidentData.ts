import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchIncidents, upsertIncident, deleteIncident } from '../services/incidentService'
import { toast } from 'sonner'

// Legacy named exports kept for backward compat
export function useIncidents() {
  return useQuery({ queryKey: ['incidents'], queryFn: fetchIncidents, staleTime: 30_000 })
}
export function useUpsertIncident() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertIncident, onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }) })
}
export function useDeleteIncident() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteIncident, onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }) })
}

// Standard data hook: React Query wrapper that invalidates on mutation.
// See CLAUDE.md ("Established patterns to follow") and docs/architecture/INTERLINKS.md.
// Historical note: docs/archive/AGENT_CONTEXT.md.
export function useIncidentData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['incidents', filters],
    queryFn: () => fetchIncidents(filters),
    staleTime: 30_000,
  })

  // The Incident Log reads the same table under the 'ri-incidents' key —
  // invalidate both namespaces so a write here is visible there immediately.
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['incidents'] })
    qc.invalidateQueries({ queryKey: ['ri-incidents'] })
  }

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertIncident(record),
    onSuccess: () => { invalidate(); toast.success('Incident saved') },
    onError: (e: any) => toast.error(e?.message ? `Save failed: ${e.message}` : 'Failed to save incident'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteIncident(id),
    onSuccess: () => { invalidate(); toast.success('Incident deleted') },
    onError: (e: any) => toast.error(e?.message ? `Delete failed: ${e.message}` : 'Failed to delete incident'),
  })

  return {
    incidents: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
