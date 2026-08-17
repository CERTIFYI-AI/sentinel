import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllSecurityScans, fetchSecurityScansById, upsertSecurityScans, deleteSecurityScans } from '@/services/securityScansService'
import { toast } from 'sonner'

export function useSecurityScansData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error, refetch } = useQuery({
    queryKey: ['securityScans', filters],
    queryFn: () => fetchAllSecurityScans(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertSecurityScans(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['securityScans'] }); toast.success('Scan saved') },
    onError: () => toast.error('Failed to save scan'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteSecurityScans(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['securityScans'] }); toast.success('Scan deleted') },
    onError: () => toast.error('Failed to delete scan'),
  })

  return {
    items, isLoading, error, refetch,
    saveSecurityScans: saveMutation.mutateAsync,
    removeSecurityScans: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useSecurityScansById(id: string) {
  return useQuery({
    queryKey: ['securityScans', id],
    queryFn: () => fetchSecurityScansById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
