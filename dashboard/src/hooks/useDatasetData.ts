import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchDatasets, upsertDataset, deleteDataset } from '../services/datasetService'
import { DATASETS } from '../data/seed'
export function useDatasets() {
  return useQuery({ queryKey: ['datasets'], queryFn: async () => { const rows = await fetchDatasets(); return rows.length > 0 ? rows : DATASETS }, staleTime: 30_000 })
}
export function useUpsertDataset() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertDataset, onSuccess: () => qc.invalidateQueries({ queryKey: ['datasets'] }) })
}
export function useDeleteDataset() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteDataset, onSuccess: () => qc.invalidateQueries({ queryKey: ['datasets'] }) })
}
