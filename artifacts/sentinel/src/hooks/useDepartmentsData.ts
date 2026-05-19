import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllDepartments, fetchDepartmentsById, upsertDepartments, deleteDepartments } from '@/services/departmentsService'
import { toast } from 'sonner'

export function useDepartmentsData(filters: Record<string, any> = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['departments', filters],
    queryFn: () => fetchAllDepartments(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: any) => upsertDepartments(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Department saved') },
    onError: () => toast.error('Failed to save department'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteDepartments(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['departments'] }); toast.success('Department deleted') },
    onError: () => toast.error('Failed to delete department'),
  })

  return {
    items, isLoading, error,
    saveDepartments: saveMutation.mutateAsync,
    removeDepartments: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
  }
}

export function useDepartmentsById(id: string) {
  return useQuery({
    queryKey: ['departments', id],
    queryFn: () => fetchDepartmentsById(id),
    enabled: !!id,
    staleTime: 30_000,
  })
}
