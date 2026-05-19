import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAgents, upsertAgent, deleteAgent } from '../services/agentService'
import { AGENTS } from '../data/seed'
export function useAgents() {
  return useQuery({ queryKey: ['agents'], queryFn: async () => { const rows = await fetchAgents(); return rows.length > 0 ? rows : AGENTS }, staleTime: 30_000 })
}
export function useUpsertAgent() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertAgent, onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }) })
}
export function useDeleteAgent() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteAgent, onSuccess: () => qc.invalidateQueries({ queryKey: ['agents'] }) })
}
