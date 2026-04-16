import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchVendors, upsertVendor, deleteVendor, VendorRecord } from '@/services/vendorService'
import { toast } from 'sonner'

export function useVendorsData() {
  const qc = useQueryClient()
  const { data: vendors = [], isLoading, error } = useQuery({
    queryKey: ['vendors'],
    queryFn: fetchVendors,
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (vendor: Partial<VendorRecord>) => upsertVendor(vendor),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); toast.success('Vendor saved') },
    onError: () => toast.error('Failed to save vendor'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVendor(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['vendors'] }); toast.success('Vendor removed') },
    onError: () => toast.error('Failed to remove vendor'),
  })

  return { vendors, isLoading, error, saveVendor: saveMutation.mutateAsync, deleteVendor: deleteMutation.mutateAsync }
}
