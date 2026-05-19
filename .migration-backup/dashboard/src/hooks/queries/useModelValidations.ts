// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllModelValidations, upsertModelValidation, deleteModelValidation } from '../../services/modelValidationService'
import { toast } from 'sonner'

const QUERY_KEY = ['model-validations']

export function useModelValidations() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllModelValidations(),
    staleTime: 30_000,
  })
}

export function useUpsertModelValidation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertModelValidation(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteModelValidation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteModelValidation(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
