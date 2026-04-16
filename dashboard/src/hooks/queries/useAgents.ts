import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { AGENTS } from '../../data/seed'
import type { Agent } from '../../data/seed'
import { fetchAllAgents, upsertAgent, deleteAgent } from '../../services/agentService'

const QUERY_KEY = ['agents']

export function useAgents() {
  return useQuery<Agent[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await fetchAllAgents()
      return result && result.length > 0 ? result : AGENTS
    },
    staleTime: 30_000,
    placeholderData: AGENTS,
  })
}

export function useUpsertAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: Partial<Agent>) => upsertAgent(record as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteAgent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAgent(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
