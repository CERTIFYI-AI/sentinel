import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { DATASETS } from '../../data/seed'
import type { Dataset } from '../../data/seed'
import { fetchAllDatasets, upsertDataset, deleteDataset } from '../../services/datasetService'

const QUERY_KEY = ['datasets']

export function useDatasets() {
  return useQuery<Dataset[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await fetchAllDatasets()
      return result && result.length > 0 ? result : DATASETS
    },
    staleTime: 30_000,
    placeholderData: DATASETS,
  })
}

export function useUpsertDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: Partial<Dataset>) => upsertDataset(record as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteDataset() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteDataset(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
