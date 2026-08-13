import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchModelDna, upsertModelDna, deleteModelDna, type DnaRecord,
} from '@/services/modelDnaService'

export function useModelDnaData() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['model-dna'],
    queryFn: fetchModelDna,
    staleTime: 30_000,
  })
  const saveMutation = useMutation({
    mutationFn: (r: DnaRecord) => upsertModelDna(r),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['model-dna'] }) },
  })
  const deleteMutation = useMutation({
    mutationFn: (rowId: string) => deleteModelDna(rowId),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['model-dna'] }) },
  })
  return {
    records: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    saveDna: saveMutation.mutateAsync,
    deleteDna: deleteMutation.mutateAsync,
  }
}
