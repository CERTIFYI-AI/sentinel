// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllVendors, upsertVendor, deleteVendor } from '../../services/vendorService'
import { toast } from 'sonner'

const QUERY_KEY = ['vendors']

export function useVendors() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllVendors(),
    staleTime: 30_000,
  })
}

export function useUpsertVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertVendor(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Vendor saved') },
    onError: () => toast.error('Failed to save vendor'),
  })
}

export function useDeleteVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
