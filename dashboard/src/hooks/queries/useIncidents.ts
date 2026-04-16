import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { INCIDENTS } from '../../data/seed'
import type { Incident } from '../../data/seed'
import { fetchAllIncidents, upsertIncident, deleteIncident } from '../../services/incidentService'

const QUERY_KEY = ['incidents']

export function useIncidents() {
  return useQuery<Incident[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await fetchAllIncidents()
      return result && result.length > 0 ? result : INCIDENTS
    },
    staleTime: 30_000,
    placeholderData: INCIDENTS,
  })
}

export function useUpsertIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: Partial<Incident>) => upsertIncident(record as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteIncident(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
