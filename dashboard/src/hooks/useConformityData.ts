import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchConformityAssessments, upsertConformityAssessment, deleteConformityAssessment,
  type ConformityAssessmentRecord,
} from '../services/conformityService'

// Toasts are owned by the page; the hook only keeps the cache fresh.
export function useConformityData() {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['conformity-assessments'],
    queryFn: fetchConformityAssessments,
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: Partial<ConformityAssessmentRecord>) => upsertConformityAssessment(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['conformity-assessments'] }) },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConformityAssessment(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['conformity-assessments'] }) },
  })

  return {
    assessments: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  }
}
