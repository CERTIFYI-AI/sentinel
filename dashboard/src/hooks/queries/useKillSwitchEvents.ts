// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllKillSwitchEvents, upsertKillSwitchEvent, deleteKillSwitchEvent } from '../../services/killSwitchService'
import { toast } from 'sonner'

const QUERY_KEY = ['kill-switch-events']

export function useKillSwitchEvents() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllKillSwitchEvents(),
    staleTime: 30_000,
  })
}

export function useUpsertKillSwitchEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertKillSwitchEvent(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteKillSwitchEvent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteKillSwitchEvent(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
