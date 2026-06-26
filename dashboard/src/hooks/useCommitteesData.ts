import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { toast } from 'sonner'

export function useCommitteesData() {
  const qc = useQueryClient()
  const query = useQuery({
    queryKey: ['committees'],
    queryFn: async () => {
      const { data, error } = await supabase.from('committees').select('*').order('created_at', { ascending: false })
      if (error) { console.warn('[useCommitteesData]', error.message); return [] }
      return data ?? []
    },
    staleTime: 30_000,
  })
  const saveMutation = useMutation({
    mutationFn: async (record: any) => {
      const { data, error } = await supabase.from('committees').upsert(record).select().single()
      if (error) throw error
      return data
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['committees'] }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('committees').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['committees'] }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
  return {
    items: query.data ?? [],
    isLoading: query.isLoading,
    save: saveMutation.mutateAsync,
    remove: deleteMutation.mutateAsync,
    isSaving: saveMutation.isPending,
  }
}
