import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllConsentRecords, fetchConsentRecord, upsertConsentRecords, deleteConsentRecords } from '@/services/consentRecordsService'
import { toast } from 'sonner'

export function useConsentRecordsData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['consentRecords', filters],
    queryFn: () => fetchAllConsentRecords(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertConsentRecords(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['consentRecords'] }); toast.success('Consent saved') },
    onError: () => toast.error('Failed to save consent'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteConsentRecords(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['consentRecords'] }); toast.success('Consent deleted') },
    onError: () => toast.error('Failed to delete consent'),
  })

  return {
    items, isLoading, error,
    saveConsentRecords: saveMutation.mutateAsync,
    removeConsentRecords: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useConsentRecordsById(id: string) {
  return useQuery({
    queryKey: ['consentRecords', id],
    queryFn: () => fetchConsentRecord(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
