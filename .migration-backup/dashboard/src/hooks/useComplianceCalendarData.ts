import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllComplianceCalendar, fetchComplianceCalendarById, upsertComplianceCalendar, deleteComplianceCalendar } from '@/services/complianceCalendarService'
import { toast } from 'sonner'

export function useComplianceCalendarData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['complianceCalendar', filters],
    queryFn: () => fetchAllComplianceCalendar(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertComplianceCalendar(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['complianceCalendar'] }); toast.success('Event saved') },
    onError: () => toast.error('Failed to save event'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteComplianceCalendar(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['complianceCalendar'] }); toast.success('Event deleted') },
    onError: () => toast.error('Failed to delete event'),
  })

  return {
    items, isLoading, error,
    saveComplianceCalendar: saveMutation.mutateAsync,
    removeComplianceCalendar: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useComplianceCalendarById(id: string) {
  return useQuery({
    queryKey: ['complianceCalendar', id],
    queryFn: () => fetchComplianceCalendarById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
