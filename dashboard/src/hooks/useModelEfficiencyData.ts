import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchAllModelEfficiency, upsertModelEfficiency, deleteModelEfficiency,
  type ModelEfficiencyRecord,
} from '@/services/modelEfficiencyService'
import { toast } from 'sonner'

// Platform contract: the service THROWS on failure, so the success toast can
// only fire after the write actually resolved — never a false success.
export function useModelEfficiencyData(filters = {}) {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['model-efficiency', filters],
    queryFn: () => fetchAllModelEfficiency(filters),
    staleTime: 30_000,
  })
  const saveMutation = useMutation({
    mutationFn: (r: Partial<ModelEfficiencyRecord>) => upsertModelEfficiency(r),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ['model-efficiency'] })
      toast.success(`Benchmark saved for ${row.model_name}${row.version ? ` ${row.version}` : ''}`)
    },
    onError: (e: Error) => toast.error(`Failed to save benchmark: ${e.message}`),
  })
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteModelEfficiency(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['model-efficiency'] }); toast.success('Benchmark deleted') },
    onError: (e: Error) => toast.error(`Failed to delete benchmark: ${e.message}`),
  })
  return {
    records: query.data ?? [],
    items: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  }
}
