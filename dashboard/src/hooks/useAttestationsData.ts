import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllAttestations, fetchAttestationsById, upsertAttestations, deleteAttestations } from '@/services/attestationsService'
import { toast } from 'sonner'

export function useAttestationsData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['attestations', filters],
    queryFn: () => fetchAllAttestations(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertAttestations(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attestations'] }); toast.success('Attestation saved') },
    onError: () => toast.error('Failed to save attestation'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAttestations(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['attestations'] }); toast.success('Attestation deleted') },
    onError: () => toast.error('Failed to delete attestation'),
  })

  return {
    items, isLoading, error,
    saveAttestations: saveMutation.mutateAsync,
    removeAttestations: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useAttestationsById(id: string) {
  return useQuery({
    queryKey: ['attestations', id],
    queryFn: () => fetchAttestationsById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
