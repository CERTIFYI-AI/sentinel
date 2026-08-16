// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hooks for the Integrations module (connectors + outbound webhook
// endpoints). Mutations invalidate; errors surface from the thrown service calls.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createIntegration, fetchIntegrations, softDeleteIntegration, updateIntegration,
  createWebhook, deleteWebhook, fetchWebhooks, setWebhookActive,
  type IntegrationRecord,
} from '@/services/integrationsService'

export function useIntegrations() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['integrations'], queryFn: fetchIntegrations, staleTime: 20_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['integrations'] })
  const create = useMutation({ mutationFn: (i: Partial<IntegrationRecord>) => createIntegration(i), onSuccess: inv })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<IntegrationRecord> }) => updateIntegration(id, patch),
    onSuccess: inv,
  })
  const remove = useMutation({ mutationFn: (id: string) => softDeleteIntegration(id), onSuccess: inv })
  return {
    data: list.data ?? [],
    isLoading: list.isLoading, isError: list.isError,
    error: list.error as Error | null, refetch: list.refetch,
    create, update, remove,
  }
}

export function useWebhooks() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['webhook_endpoints'], queryFn: fetchWebhooks, staleTime: 20_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['webhook_endpoints'] })
  const create = useMutation({
    mutationFn: (input: { url: string; description?: string; eventTypes: string[] }) => createWebhook(input),
    onSuccess: inv,
  })
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setWebhookActive(id, isActive),
    onSuccess: inv,
  })
  const remove = useMutation({ mutationFn: (id: string) => deleteWebhook(id), onSuccess: inv })
  return {
    data: list.data ?? [],
    isLoading: list.isLoading, isError: list.isError,
    error: list.error as Error | null, refetch: list.refetch,
    create, toggle, remove,
  }
}
