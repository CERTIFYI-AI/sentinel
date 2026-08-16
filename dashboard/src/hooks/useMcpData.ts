// SPDX-License-Identifier: Apache-2.0
// Copyright (c) 2026 CERTIFYI-AI.
//
// React Query hooks for the MCP gateway registries. Mutations invalidate;
// errors surface from the thrown service calls.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createMcpServer, fetchMcpServers, softDeleteMcpServer, updateMcpServer,
  createMcpTool, fetchMcpTools, softDeleteMcpTool, updateMcpTool,
  type McpServerRecord, type McpToolRecord,
} from '@/services/mcpService'

export function useMcpServers() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['mcp_servers'], queryFn: fetchMcpServers, staleTime: 20_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['mcp_servers'] })
  const create = useMutation({ mutationFn: (s: Partial<McpServerRecord>) => createMcpServer(s), onSuccess: inv })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<McpServerRecord> }) => updateMcpServer(id, patch),
    onSuccess: inv,
  })
  const remove = useMutation({ mutationFn: (id: string) => softDeleteMcpServer(id), onSuccess: inv })
  return {
    data: list.data ?? [],
    isLoading: list.isLoading, isError: list.isError,
    error: list.error as Error | null, refetch: list.refetch,
    create, update, remove,
  }
}

export function useMcpTools() {
  const qc = useQueryClient()
  const list = useQuery({ queryKey: ['mcp_tools'], queryFn: fetchMcpTools, staleTime: 20_000 })
  const inv = () => qc.invalidateQueries({ queryKey: ['mcp_tools'] })
  const create = useMutation({ mutationFn: (t: Partial<McpToolRecord>) => createMcpTool(t), onSuccess: inv })
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<McpToolRecord> }) => updateMcpTool(id, patch),
    onSuccess: inv,
  })
  const remove = useMutation({ mutationFn: (id: string) => softDeleteMcpTool(id), onSuccess: inv })
  return {
    data: list.data ?? [],
    isLoading: list.isLoading, isError: list.isError,
    error: list.error as Error | null, refetch: list.refetch,
    create, update, remove,
  }
}
