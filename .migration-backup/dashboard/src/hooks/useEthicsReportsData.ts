import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllEthicsReports, fetchEthicsReportsById, upsertEthicsReports, deleteEthicsReports } from '@/services/ethicsReportsService'
import { toast } from 'sonner'

export function useEthicsReportsData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['ethicsReports', filters],
    queryFn: () => fetchAllEthicsReports(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertEthicsReports(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ethicsReports'] }); toast.success('Report saved') },
    onError: () => toast.error('Failed to save report'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEthicsReports(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ethicsReports'] }); toast.success('Report deleted') },
    onError: () => toast.error('Failed to delete report'),
  })

  return {
    items, isLoading, error,
    saveEthicsReports: saveMutation.mutateAsync,
    removeEthicsReports: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useEthicsReportsById(id: string) {
  return useQuery({
    queryKey: ['ethicsReports', id],
    queryFn: () => fetchEthicsReportsById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
