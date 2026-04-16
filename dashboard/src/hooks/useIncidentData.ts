import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchIncidents, upsertIncident, deleteIncident } from '../services/incidentService'
import { INCIDENTS } from '../data/seed'
export function useIncidents() {
  return useQuery({ queryKey: ['incidents'], queryFn: async () => { const rows = await fetchIncidents(); return rows.length > 0 ? rows : INCIDENTS }, staleTime: 30_000 })
}
export function useUpsertIncident() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertIncident, onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }) })
}
export function useDeleteIncident() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteIncident, onSuccess: () => qc.invalidateQueries({ queryKey: ['incidents'] }) })
}
