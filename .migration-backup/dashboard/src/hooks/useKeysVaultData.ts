import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllKeysVault, fetchKeysVaultById, upsertKeysVault, deleteKeysVault } from '@/services/keysVaultService'
import { toast } from 'sonner'

export function useKeysVaultData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['keysVault', filters],
    queryFn: () => fetchAllKeysVault(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertKeysVault(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['keysVault'] }); toast.success('Key saved') },
    onError: () => toast.error('Failed to save key'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteKeysVault(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['keysVault'] }); toast.success('Key deleted') },
    onError: () => toast.error('Failed to delete key'),
  })

  return {
    items, isLoading, error,
    saveKeysVault: saveMutation.mutateAsync,
    removeKeysVault: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useKeysVaultById(id: string) {
  return useQuery({
    queryKey: ['keysVault', id],
    queryFn: () => fetchKeysVaultById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
