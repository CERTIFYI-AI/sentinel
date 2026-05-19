// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllControls, upsertControl, deleteControl } from '../../services/controlService'
import { toast } from 'sonner'

const QUERY_KEY = ['controls']

export function useControls() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllControls(),
    staleTime: 30_000,
  })
}

export function useUpsertControl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertControl(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Control saved') },
    onError: () => toast.error('Failed to save control'),
  })
}

export function useDeleteControl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteControl(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
