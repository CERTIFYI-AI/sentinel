import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchExplainabilityReports, upsertExplainabilityReport } from '../../services/explainabilityService'

export function useExplainabilityReports() {
  return useQuery({ queryKey: ['explainability_reports'], queryFn: fetchExplainabilityReports, staleTime: 30000, placeholderData: [] })
}

export function useUpsertExplainabilityReport() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: (r: any) => upsertExplainabilityReport(r), onSuccess: () => qc.invalidateQueries({ queryKey: ['explainability_reports'] }) })
}
