import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchPromptRecords, upsertPromptRecord, deletePromptRecord,
} from '@/services/promptService'
import type { PromptRecord } from '@/data/seed'

export function usePromptRegistryData() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['prompt-registry'],
    queryFn: fetchPromptRecords,
    staleTime: 30_000,
  })
  const saveMutation = useMutation({
    mutationFn: (r: PromptRecord) => upsertPromptRecord(r),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompt-registry'] }) },
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deletePromptRecord(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['prompt-registry'] }) },
  })
  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
  }
}
