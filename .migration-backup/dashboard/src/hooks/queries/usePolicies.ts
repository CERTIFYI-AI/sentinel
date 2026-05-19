// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllPolicys, upsertPolicy, deletePolicy } from '../../services/policyService'
import { toast } from 'sonner'

const QUERY_KEY = ['policies']

export function usePolicies() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllPolicys(),
    staleTime: 30_000,
  })
}

export function useUpsertPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertPolicy(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Policy saved') },
    onError: () => toast.error('Failed to save policy'),
  })
}

export function useDeletePolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deletePolicy(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
