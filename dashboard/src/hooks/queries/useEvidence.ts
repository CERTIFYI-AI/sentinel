import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { EVIDENCE } from '../../data/seed'
import type { Evidence } from '../../data/seed'
import { fetchAllEvidences, upsertEvidence, deleteEvidence } from '../../services/evidenceService'

const QUERY_KEY = ['evidence']

export function useEvidence() {
  return useQuery<Evidence[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await fetchAllEvidences()
      return result && result.length > 0 ? result : EVIDENCE
    },
    staleTime: 30_000,
    placeholderData: EVIDENCE,
  })
}

export function useUpsertEvidence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: Partial<Evidence>) => upsertEvidence(record as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteEvidence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEvidence(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
