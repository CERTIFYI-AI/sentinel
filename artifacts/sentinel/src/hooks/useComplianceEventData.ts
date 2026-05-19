// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchComplianceEvents, upsertComplianceEvent, deleteComplianceEvent } from '../services/complianceEventService'
import { COMPLIANCE_EVENTS } from '../data/seed'
export function useComplianceEvents() {
  return useQuery({ queryKey: ['compliance_events'], queryFn: async () => { const rows = await fetchComplianceEvents(); return rows.length > 0 ? rows : COMPLIANCE_EVENTS }, staleTime: 30_000 })
}
export function useUpsertComplianceEvent() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertComplianceEvent, onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance_events'] }) })
}
export function useDeleteComplianceEvent() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteComplianceEvent, onSuccess: () => qc.invalidateQueries({ queryKey: ['compliance_events'] }) })
}
