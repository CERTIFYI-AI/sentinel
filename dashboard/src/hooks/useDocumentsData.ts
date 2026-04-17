import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllDocuments, fetchDocumentsById, upsertDocuments, deleteDocuments } from '@/services/documentsService'
import { toast } from 'sonner'

export function useDocumentsData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['documents', filters],
    queryFn: () => fetchAllDocuments(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertDocuments(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast.success('Document saved') },
    onError: () => toast.error('Failed to save document'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDocuments(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['documents'] }); toast.success('Document deleted') },
    onError: () => toast.error('Failed to delete document'),
  })

  return {
    items, isLoading, error,
    saveDocuments: saveMutation.mutateAsync,
    removeDocuments: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useDocumentsById(id: string) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => fetchDocumentsById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
