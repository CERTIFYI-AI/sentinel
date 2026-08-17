import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAllEvidences, upsertEvidence, deleteEvidence, fetchEvidenceChain,
  fetchEvidenceArtifacts,
  type EvidenceRecord,
} from '../services/evidenceService'

// Success/error toasts are owned by the page so a single, context-rich
// notification fires per action — the hook only keeps the cache fresh.
export function useEvidenceData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['evidence', filters],
    queryFn: () => fetchAllEvidences(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: Partial<EvidenceRecord>) => upsertEvidence(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evidence'] }) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEvidence(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['evidence'] }) },
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

// Stored-file index (`evidence_artifacts`) — links the vault to the per-file
// Custody Explorer at /evidence/custody/:artifactId.
export function useEvidenceArtifacts(limit = 200) {
  const query = useQuery({
    queryKey: ['evidence-artifacts', limit],
    queryFn: () => fetchEvidenceArtifacts(limit),
    staleTime: 30_000,
  })
  return { artifacts: query.data ?? [], isLoading: query.isLoading, error: query.error }
}

// Read-only view over the append-only evidence_chain custody ledger.
export function useEvidenceChain(limit = 200) {
  const query = useQuery({
    queryKey: ['evidence-chain', limit],
    queryFn: () => fetchEvidenceChain(limit),
    staleTime: 30_000,
  })
  return { chain: query.data ?? [], isLoading: query.isLoading, error: query.error }
}
