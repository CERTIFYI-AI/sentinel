import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllPolicyFirewall, fetchPolicyFirewallById, upsertPolicyFirewall, deletePolicyFirewall } from '@/services/policyFirewallService'
import { toast } from 'sonner'

export function usePolicyFirewallData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['policyFirewall', filters],
    queryFn: () => fetchAllPolicyFirewall(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertPolicyFirewall(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policyFirewall'] }); toast.success('Rule saved') },
    onError: () => toast.error('Failed to save rule'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePolicyFirewall(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['policyFirewall'] }); toast.success('Rule deleted') },
    onError: () => toast.error('Failed to delete rule'),
  })

  return {
    items, isLoading, error,
    savePolicyFirewall: saveMutation.mutateAsync,
    removePolicyFirewall: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function usePolicyFirewallById(id: string) {
  return useQuery({
    queryKey: ['policyFirewall', id],
    queryFn: () => fetchPolicyFirewallById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
