import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllIncidents, upsertIncident, deleteIncident } from '../../services/incidentService'
import { toast } from 'sonner'

const QUERY_KEY = ['incidents']

export function useIncidents() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllIncidents(),
    staleTime: 30_000,
  })
}

export function useUpsertIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertIncident(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Incident saved') },
    onError: () => toast.error('Failed to save incident'),
  })
}

export function useDeleteIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteIncident(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
