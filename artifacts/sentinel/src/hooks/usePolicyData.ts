// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPolicys, upsertPolicy, deletePolicy } from '../services/policyService'
import { toast } from 'sonner'

// Legacy exports for backward compat
export function usePolicys() {
  return useQuery({ queryKey: ['policies'], queryFn: fetchPolicys, staleTime: 30_000 })
}
export function useUpsertPolicy() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertPolicy, onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }) })
}
export function useDeletePolicy() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deletePolicy, onSuccess: () => qc.invalidateQueries({ queryKey: ['policies'] }) })
}

// Standard hook
export function usePolicyData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()

  const query = useQuery({
    queryKey: ['policies', filters],
    queryFn: () => fetchPolicys(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertPolicy(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }); toast.success('Policy saved') },
    onError: () => toast.error('Failed to save policy'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePolicy(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policies'] }); toast.success('Policy deleted') },
    onError: () => toast.error('Failed to delete policy'),
  })

  return {
    policies: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}
