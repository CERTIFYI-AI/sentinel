import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllRedTeam, fetchRedTeamById, upsertRedTeam, deleteRedTeam } from '@/services/redTeamService'
import { toast } from 'sonner'

export function useRedTeamData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['redTeam', filters],
    queryFn: () => fetchAllRedTeam(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertRedTeam(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['redTeam'] }); toast.success('Campaign saved') },
    onError: () => toast.error('Failed to save campaign'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteRedTeam(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['redTeam'] }); toast.success('Campaign deleted') },
    onError: () => toast.error('Failed to delete campaign'),
  })

  return {
    items, isLoading, error,
    saveRedTeam: saveMutation.mutateAsync,
    removeRedTeam: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useRedTeamById(id: string) {
  return useQuery({
    queryKey: ['redTeam', id],
    queryFn: () => fetchRedTeamById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
