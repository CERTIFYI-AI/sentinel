import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchEvidences, upsertEvidence, deleteEvidence } from '../services/evidenceService'
import { EVIDENCE_ITEMS } from '../data/seed'
export function useEvidences() {
  return useQuery({ queryKey: ['evidence'], queryFn: async () => { const rows = await fetchEvidences(); return rows.length > 0 ? rows : EVIDENCE_ITEMS }, staleTime: 30_000 })
}
export function useUpsertEvidence() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertEvidence, onSuccess: () => qc.invalidateQueries({ queryKey: ['evidence'] }) })
}
export function useDeleteEvidence() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteEvidence, onSuccess: () => qc.invalidateQueries({ queryKey: ['evidence'] }) })
}
