import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchEvidences, upsertEvidence, deleteEvidence } from '../services/evidenceService'
import { toast } from 'sonner'

// Legacy exports for backward compat
export function useEvidences() {
  return useQuery({ queryKey: ['evidence'], queryFn: fetchEvidences, staleTime: 30_000 })
}
export function useUpsertEvidence() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertEvidence, onSuccess: () => qc.invalidateQueries({ queryKey: ['evidence'] }) })
}
export function useDeleteEvidence() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteEvidence, onSuccess: () => qc.invalidateQueries({ queryKey: ['evidence'] }) })
}

// Standard hook
export function useEvidenceData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['evidence', filters],
    queryFn: () => fetchEvidences(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertEvidence(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evidence'] }); toast.success('Evidence saved') },
    onError: () => toast.error('Failed to save evidence'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvidence(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evidence'] }); toast.success('Evidence deleted') },
    onError: () => toast.error('Failed to delete evidence'),
  })

  return {
    evidence: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
