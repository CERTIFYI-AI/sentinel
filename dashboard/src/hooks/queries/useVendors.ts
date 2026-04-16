import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { VENDORS } from '../../data/seed'
import type { Vendor } from '../../data/seed'
import { fetchAllVendors, upsertVendor, deleteVendor } from '../../services/vendorService'

const QUERY_KEY = ['vendors']

export function useVendors() {
  return useQuery<Vendor[]>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const result = await fetchAllVendors()
      return result && result.length > 0 ? result : VENDORS
    },
    staleTime: 30_000,
    placeholderData: VENDORS,
  })
}

export function useUpsertVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: Partial<Vendor>) => upsertVendor(record as any),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}

export function useDeleteVendor() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
  })
}
