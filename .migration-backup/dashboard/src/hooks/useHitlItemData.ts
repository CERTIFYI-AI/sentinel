// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchHitlItems, upsertHitlItem, deleteHitlItem } from '../services/hitlService'
import { toast } from 'sonner'

export function useHitlItemData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['hitlItems', filters],
    queryFn: () => fetchHitlItems(),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertHitlItem(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hitlItems'] }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteHitlItem(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hitlItems'] }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })

  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
