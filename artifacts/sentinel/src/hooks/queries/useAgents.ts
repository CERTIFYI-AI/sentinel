// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllAgents, upsertAgent, deleteAgent } from '../../services/agentService'
import { toast } from 'sonner'

const QUERY_KEY = ['agents']

export function useAgents() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllAgents(),
    staleTime: 30_000,
  })
}

export function useUpsertAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertAgent(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Agent saved') },
    onError: () => toast.error('Failed to save agent'),
  })
}

export function useDeleteAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAgent(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
