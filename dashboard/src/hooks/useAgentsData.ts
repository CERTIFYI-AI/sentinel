// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query wrappers over agentsService (legacy `agents` table). The agent
// governance pages read the canonical agent_gov_registry via agentRecordHooks
// instead. Success toasts fire only after the write resolves — the service
// throws on failure, so onSuccess is a real success.

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAllAgents, fetchAgentsById, upsertAgents, deleteAgents, type AgentsFilters } from '@/services/agentsService'
import { toast } from 'sonner'

export function useAgentsData(filters: AgentsFilters = {}) {
  const qc = useQueryClient()
  const { data: items = [], isLoading, error } = useQuery({
    queryKey: ['agents', filters],
    queryFn: () => fetchAllAgents(filters),
    staleTime: 30_000,
  })

  const saveMutation = useMutation({
    mutationFn: (record: Record<string, unknown>) => upsertAgents(record),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); toast.success('Agent saved') },
    onError: (e: Error) => toast.error(e.message || 'Failed to save agent'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAgents(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['agents'] }); toast.success('Agent deleted') },
    onError: (e: Error) => toast.error(e.message || 'Failed to delete agent'),
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
