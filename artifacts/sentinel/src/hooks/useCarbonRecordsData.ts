import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllCarbonRecords, fetchCarbonRecordsById, upsertCarbonRecords, deleteCarbonRecords } from '@/services/carbonRecordsService'
import { toast } from 'sonner'

export function useCarbonRecordsData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['carbonRecords', filters],
    queryFn: () => fetchAllCarbonRecords(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertCarbonRecords(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['carbonRecords'] }); toast.success('Record saved') },
    onError: () => toast.error('Failed to save record'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCarbonRecords(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['carbonRecords'] }); toast.success('Record deleted') },
    onError: () => toast.error('Failed to delete record'),
  })

  return {
    items, isLoading, error,
    saveCarbonRecords: saveMutation.mutateAsync,
    removeCarbonRecords: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useCarbonRecordsById(id: string) {
  return useQuery({
    queryKey: ['carbonRecords', id],
    queryFn: () => fetchCarbonRecordsById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
