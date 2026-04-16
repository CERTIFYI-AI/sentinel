import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchHitlItems, upsertHitlItem, deleteHitlItem } from '../services/hitlService'
import { HITL_ITEMS } from '../data/seed'
export function useHitlItems() {
  return useQuery({ queryKey: ['hitl_items'], queryFn: async () => { const rows = await fetchHitlItems(); return rows.length > 0 ? rows : HITL_ITEMS }, staleTime: 30_000 })
}
export function useUpsertHitlItem() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertHitlItem, onSuccess: () => qc.invalidateQueries({ queryKey: ['hitl_items'] }) })
}
export function useDeleteHitlItem() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteHitlItem, onSuccess: () => qc.invalidateQueries({ queryKey: ['hitl_items'] }) })
}
