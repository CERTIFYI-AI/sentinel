import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchPromptRecords, upsertPromptRecord, deletePromptRecord } from '../services/promptService'
import { PROMPT_REGISTRY } from '../data/seed'
export function usePromptRecords() {
  return useQuery({ queryKey: ['prompt_registry'], queryFn: async () => { const rows = await fetchPromptRecords(); return rows.length > 0 ? rows : PROMPT_REGISTRY }, staleTime: 30_000 })
}
export function useUpsertPromptRecord() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: upsertPromptRecord, onSuccess: () => qc.invalidateQueries({ queryKey: ['prompt_registry'] }) })
}
export function useDeletePromptRecord() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deletePromptRecord, onSuccess: () => qc.invalidateQueries({ queryKey: ['prompt_registry'] }) })
}
