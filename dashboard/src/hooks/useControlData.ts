import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchControls, upsertControl, deleteControl } from '../services/controlService'
import { CONTROLS } from '../data/seed'
export function useControls() {
  return useQuery({ queryKey: ['controls'], queryFn: async () => { const rows = await fetchControls(); return rows.length > 0 ? rows : CONTROLS }, staleTime: 30_000 })
}
export function useUpsertControl() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertControl, onSuccess: () => qc.invalidateQueries({ queryKey: ['controls'] }) })
}
export function useDeleteControl() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteControl, onSuccess: () => qc.invalidateQueries({ queryKey: ['controls'] }) })
}
