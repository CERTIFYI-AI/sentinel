import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllRedTeamFindings, fetchRedTeamFindingsById, upsertRedTeamFindings, deleteRedTeamFindings } from '@/services/redTeamFindingsService'
import { toast } from 'sonner'

export function useRedTeamFindingsData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['redTeamFindings', filters],
    queryFn: () => fetchAllRedTeamFindings(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertRedTeamFindings(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['redTeamFindings'] }); toast.success('Finding saved') },
    onError: () => toast.error('Failed to save finding'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRedTeamFindings(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['redTeamFindings'] }); toast.success('Finding deleted') },
    onError: () => toast.error('Failed to delete finding'),
  })

  return {
    items, isLoading, error,
    saveRedTeamFindings: saveMutation.mutateAsync,
    removeRedTeamFindings: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useRedTeamFindingsById(id: string) {
  return useQuery({
    queryKey: ['redTeamFindings', id],
    queryFn: () => fetchRedTeamFindingsById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
