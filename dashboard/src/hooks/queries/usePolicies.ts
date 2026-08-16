// SPDX-License-Identifier: Apache-2.0
// React Query hooks for policies on the platform contract: the service throws
// on failure so onError is reachable, and these hooks OWN the success/error
// toasts — pages must not fire their own success toasts on top (no
// double-toasting, no fake success).
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllPolicies, upsertPolicy, deletePolicy, type PolicyRecord } from '../../services/policyService'
import { toast } from 'sonner'

const QUERY_KEY = ['policies']

export function usePolicies() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllPolicies(),
    staleTime: 30_000,
  })
}

export function useUpsertPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: PolicyRecord) => upsertPolicy(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Policy saved') },
    onError: (e: any) => toast.error(e?.message ? `Save failed: ${e.message}` : 'Failed to save policy'),
  })
}

export function useDeletePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePolicy(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Policy deleted') },
    onError: (e: any) => toast.error(e?.message ? `Delete failed: ${e.message}` : 'Failed to delete policy'),
  })
}
