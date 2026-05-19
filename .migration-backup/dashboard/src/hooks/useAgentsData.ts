import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllAgents, fetchAgentsById, upsertAgents, deleteAgents } from '@/services/agentsService'
import { toast } from 'sonner'

export function useAgentsData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['agents', filters],
    queryFn: () => fetchAllAgents(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertAgents(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); toast.success('Agent saved') },
    onError: () => toast.error('Failed to save agent'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAgents(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); toast.success('Agent deleted') },
    onError: () => toast.error('Failed to delete agent'),
  })

  return {
    items, isLoading, error,
    saveAgents: saveMutation.mutateAsync,
    removeAgents: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useAgentsById(id: string) {
  return useQuery({
    queryKey: ['agents', id],
    queryFn: () => fetchAgentsById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
