import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllEsgReports, upsertEsgReport, deleteEsgReport } from '@/services/esgService'
import { toast } from 'sonner'

export function useEsgData(filters = {}) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['esg-reports', filters],
    queryFn: () => fetchAllEsgReports(filters),
    staleTime: 30_000,
  })
  const saveMutation = useMutation({
    mutationFn: (r: any) => upsertEsgReport(r),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['esg-reports'] }); toast.success('ESG report saved') },
    onError: () => toast.error('Failed to save ESG report'),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteEsgReport(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['esg-reports'] }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
  return {
    reports: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  }
}
