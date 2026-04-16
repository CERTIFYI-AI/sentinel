import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { CONTROLS } from '../../data/seed'
import type { Control } from '../../data/seed'
import { fetchAllControls, upsertControl, deleteControl } from '../../services/controlService'

const QUERY_KEY = ['controls']

export function useControls() {
  return useQuery<Control[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await fetchAllControls()
      return result && result.length > 0 ? result : CONTROLS
    },
    staleTime: 30_000,
    placeholderData: CONTROLS,
  })
}

export function useUpsertControl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: Partial<Control>) => upsertControl(record as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteControl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteControl(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
