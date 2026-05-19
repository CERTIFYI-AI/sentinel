// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllGaps, upsertGap, deleteGap } from '@/services/gapService'
import { toast } from 'sonner'

export function useGapData(filters = {}) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['gap-analysis', filters],
    queryFn: () => fetchAllGaps(filters),
    staleTime: 30_000,
  })
  const saveMutation = useMutation({
    mutationFn: (r: any) => upsertGap(r),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gap-analysis'] }); toast.success('Gap saved') },
    onError: () => toast.error('Failed to save gap'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteGap(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['gap-analysis'] }); toast.success('Gap deleted') },
    onError: () => toast.error('Failed to delete'),
  })
  return {
    gaps: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  }
}
