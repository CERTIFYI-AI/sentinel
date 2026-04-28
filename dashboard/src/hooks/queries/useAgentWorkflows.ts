// @ts-nocheck
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllAgentWorkflows, upsertAgentWorkflow, deleteAgentWorkflow } from '../../services/agentWorkflowService'
import { toast } from 'sonner'

const QUERY_KEY = ['agent-workflows']

export function useAgentWorkflows() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => fetchAllAgentWorkflows(),
    staleTime: 30_000,
  })
}

export function useUpsertAgentWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (record: any) => upsertAgentWorkflow(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Saved') },
    onError: () => toast.error('Failed to save'),
  })
}

export function useDeleteAgentWorkflow() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAgentWorkflow(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: QUERY_KEY }); toast.success('Deleted') },
    onError: () => toast.error('Failed to delete'),
  })
}
